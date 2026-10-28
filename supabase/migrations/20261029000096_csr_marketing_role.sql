-- =============================================================================
-- CSR_MARKETING role — multi-branch booking CSR (calendar + limited patient lookup)
-- Run manually in Supabase SQL Editor. Do not auto-apply from the app.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Role + helpers
-- ---------------------------------------------------------------------------

insert into public.roles (id, description) values
  (
    'CSR_MARKETING',
    'CSR Marketing — multi-branch calendar/booking with limited patient lookup'
  )
on conflict (id) do update
  set description = excluded.description;

create or replace function public.is_csr_marketing()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(array['CSR_MARKETING']);
$$;

comment on function public.is_csr_marketing() is
  'True when the signed-in user has CSR_MARKETING.';

-- Assigned clinic branches for CSR (from user_roles rows; supports many branches)
create or replace function public.user_csr_branch_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select ur.branch_id
  from public.user_roles ur
  join public.branches b on b.id = ur.branch_id
  where ur.user_id = auth.uid()
    and ur.role_id = 'CSR_MARKETING'
    and ur.branch_id is not null
    and ur.branch_id <> '00000000-0000-0000-0000-000000000001'::uuid
    and coalesce(b.branch_type, 'company_owned') <> 'warehouse'
    and b.status = 'active';
$$;

comment on function public.user_csr_branch_ids() is
  'Clinic branch UUIDs assigned to the current CSR_MARKETING user.';

revoke all on function public.is_csr_marketing() from public;
revoke all on function public.user_csr_branch_ids() from public;
grant execute on function public.is_csr_marketing() to authenticated, service_role;
grant execute on function public.user_csr_branch_ids() to authenticated, service_role;

-- Convenience view for admin UIs (same rows as user_roles for this role)
create or replace view public.v_staff_branch_assignments as
select
  ur.user_id,
  ur.role_id,
  ur.branch_id,
  b.name as branch_name,
  b.code as branch_code,
  p.email,
  p.full_name
from public.user_roles ur
join public.branches b on b.id = ur.branch_id
left join public.profiles p on p.id = ur.user_id
where ur.role_id = 'CSR_MARKETING';

comment on view public.v_staff_branch_assignments is
  'CSR_MARKETING multi-branch assignments (backed by user_roles).';

grant select on public.v_staff_branch_assignments to authenticated;

-- HQ sets CSR branch list (replaces prior CSR_MARKETING rows for that user)
create or replace function public.set_csr_branch_assignments(
  p_user_id uuid,
  p_branch_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hq constant uuid := '00000000-0000-0000-0000-000000000001';
  v_bid uuid;
  v_ok boolean;
begin
  if not (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or auth.role() = 'service_role'
  ) then
    raise exception 'not authorized: HQ only';
  end if;

  if p_user_id is null then
    raise exception 'user_id is required';
  end if;

  delete from public.user_roles
  where user_id = p_user_id
    and role_id = 'CSR_MARKETING';

  if p_branch_ids is null or cardinality(p_branch_ids) = 0 then
    return;
  end if;

  foreach v_bid in array p_branch_ids loop
    if v_bid is null or v_bid = v_hq then
      raise exception 'invalid CSR branch assignment';
    end if;
    select exists (
      select 1
      from public.branches b
      where b.id = v_bid
        and b.status = 'active'
        and coalesce(b.branch_type, 'company_owned') <> 'warehouse'
    ) into v_ok;
    if not v_ok then
      raise exception 'branch not allowed for CSR: %', v_bid;
    end if;
    insert into public.user_roles (user_id, role_id, branch_id)
    values (p_user_id, 'CSR_MARKETING', v_bid)
    on conflict do nothing;
  end loop;
end;
$$;

revoke all on function public.set_csr_branch_assignments(uuid, uuid[]) from public;
grant execute on function public.set_csr_branch_assignments(uuid, uuid[]) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Appointment columns (audit + marketing attribution)
-- ---------------------------------------------------------------------------

alter table public.appointments
  add column if not exists updated_by uuid references public.profiles (id),
  add column if not exists marketing_campaign text,
  add column if not exists marketing_source text,
  add column if not exists booking_notes text;

comment on column public.appointments.updated_by is
  'Last staff profile that modified the booking';
comment on column public.appointments.marketing_source is
  'CSR marketing channel (Facebook Ads, Instagram, …)';
comment on column public.appointments.marketing_campaign is
  'Optional campaign / ad set name from CSR booking';
comment on column public.appointments.booking_notes is
  'Non-medical CSR booking notes (not clinical chart)';

-- Keep lead_source in sync when marketing_source is set (legacy reports)
create or replace function public.appointments_set_audit_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.created_by is null then
      new.created_by := auth.uid();
    end if;
    new.updated_by := coalesce(new.updated_by, auth.uid());
    new.updated_at := coalesce(new.updated_at, now());
    if new.marketing_source is not null and coalesce(new.lead_source, '') = '' then
      new.lead_source := new.marketing_source;
    end if;
    if new.marketing_campaign is not null and coalesce(new.campaign_promo, '') = '' then
      new.campaign_promo := new.marketing_campaign;
    end if;
  elsif tg_op = 'UPDATE' then
    new.updated_by := auth.uid();
    new.updated_at := now();
    if new.marketing_source is not null
       and new.marketing_source is distinct from old.marketing_source then
      new.lead_source := new.marketing_source;
    end if;
    if new.marketing_campaign is not null
       and new.marketing_campaign is distinct from old.marketing_campaign then
      new.campaign_promo := new.marketing_campaign;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists appointments_audit_fields_trg on public.appointments;
create trigger appointments_audit_fields_trg
  before insert or update on public.appointments
  for each row
  execute function public.appointments_set_audit_fields();

-- Structured audit trail for CSR / booking changes
create table if not exists public.appointment_booking_audit (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  actor_id uuid references public.profiles (id),
  action text not null,
  branch_id uuid references public.branches (id),
  client_id uuid references public.clients (id),
  previous_status text,
  new_status text,
  marketing_source text,
  marketing_campaign text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists appointment_booking_audit_appt_idx
  on public.appointment_booking_audit (appointment_id, created_at desc);
create index if not exists appointment_booking_audit_actor_idx
  on public.appointment_booking_audit (actor_id, created_at desc);

alter table public.appointment_booking_audit enable row level security;

drop policy if exists appointment_booking_audit_select on public.appointment_booking_audit;
create policy appointment_booking_audit_select on public.appointment_booking_audit
  for select to authenticated
  using (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN', 'BRANCH_ADMIN'])
    or (
      public.is_csr_marketing()
      and actor_id = auth.uid()
    )
  );

drop policy if exists appointment_booking_audit_insert on public.appointment_booking_audit;
create policy appointment_booking_audit_insert on public.appointment_booking_audit
  for insert to authenticated
  with check (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN', 'BRANCH_ADMIN', 'RECEPTIONIST', 'CSR_MARKETING'])
  );

comment on table public.appointment_booking_audit is
  'Booking create/reschedule/status audit (CSR identity, branch, patient, source).';

create or replace function public.log_appointment_booking_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.appointment_booking_audit (
      appointment_id, actor_id, action, branch_id, client_id,
      previous_status, new_status, marketing_source, marketing_campaign, detail
    ) values (
      new.id, auth.uid(), 'created', new.branch_id, new.client_id,
      null, new.status, new.marketing_source, new.marketing_campaign,
      jsonb_build_object(
        'start_at', new.start_at,
        'end_at', new.end_at,
        'treatment_id', new.treatment_id,
        'staff_id', new.staff_id
      )
    );
    insert into public.appointment_status_history (appointment_id, status, changed_by, note)
    values (new.id, new.status, auth.uid(), 'Booking created');
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.status is distinct from old.status
       or new.start_at is distinct from old.start_at
       or new.end_at is distinct from old.end_at
       or new.staff_id is distinct from old.staff_id
       or new.branch_id is distinct from old.branch_id then
      insert into public.appointment_booking_audit (
        appointment_id, actor_id, action, branch_id, client_id,
        previous_status, new_status, marketing_source, marketing_campaign, detail
      ) values (
        new.id, auth.uid(),
        case
          when new.status is distinct from old.status then 'status_changed'
          when new.start_at is distinct from old.start_at
            or new.end_at is distinct from old.end_at then 'rescheduled'
          else 'updated'
        end,
        new.branch_id, new.client_id,
        old.status, new.status, new.marketing_source, new.marketing_campaign,
        jsonb_build_object(
          'old_start_at', old.start_at,
          'new_start_at', new.start_at,
          'old_end_at', old.end_at,
          'new_end_at', new.end_at,
          'old_staff_id', old.staff_id,
          'new_staff_id', new.staff_id
        )
      );
    end if;
    if new.status is distinct from old.status then
      insert into public.appointment_status_history (appointment_id, status, changed_by, note)
      values (new.id, new.status, auth.uid(), 'Status updated');
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists appointments_booking_audit_trg on public.appointments;
create trigger appointments_booking_audit_trg
  after insert or update on public.appointments
  for each row
  execute function public.log_appointment_booking_audit();

-- ---------------------------------------------------------------------------
-- 3. Appointments RLS — CSR sees own bookings fully; not others' PII via table
-- ---------------------------------------------------------------------------

drop policy if exists appointments_select on public.appointments;
create policy appointments_select on public.appointments
  for select to authenticated
  using (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or client_id in (select id from public.clients where profile_id = auth.uid())
    or (
      public.has_role(array[
        'BRANCH_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE', 'STAFF', 'AESTHETICIAN'
      ])
      and branch_id in (select public.user_branch_ids())
    )
    -- CSR: only bookings they created on assigned branches
    or (
      public.is_csr_marketing()
      and created_by = auth.uid()
      and branch_id in (select public.user_csr_branch_ids())
    )
  );

drop policy if exists appointments_write on public.appointments;
create policy appointments_write on public.appointments
  for all to authenticated
  using (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or client_id in (select id from public.clients where profile_id = auth.uid())
    or (
      public.has_role(array[
        'BRANCH_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE', 'STAFF', 'AESTHETICIAN'
      ])
      and (
        not public.is_franchise_branch_owner()
        or branch_id in (select public.user_franchise_branch_ids())
      )
    )
    or (
      public.is_csr_marketing()
      and created_by = auth.uid()
      and branch_id in (select public.user_csr_branch_ids())
    )
  )
  with check (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or client_id in (select id from public.clients where profile_id = auth.uid())
    or (
      public.has_role(array[
        'BRANCH_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE', 'STAFF', 'AESTHETICIAN'
      ])
      and (
        not public.is_franchise_branch_owner()
        or branch_id in (select public.user_franchise_branch_ids())
      )
    )
    or (
      public.is_csr_marketing()
      and branch_id in (select public.user_csr_branch_ids())
      and coalesce(created_by, auth.uid()) = auth.uid()
    )
  );

comment on policy appointments_select on public.appointments is
  'HQ/clinic staff by branch; CSR_MARKETING only own created bookings on assigned branches.';

-- ---------------------------------------------------------------------------
-- 4. Secure patient lookup / limited create (no full clients table for CSR)
-- ---------------------------------------------------------------------------

-- Do NOT add CSR_MARKETING to clients_select / clients_write_staff.

create or replace function public.csr_norm_phone(p text)
returns text
language sql
immutable
as $$
  select case
    when nullif(trim(coalesce(p, '')), '') is null then ''
    else (
      select case
        when length(d) >= 10 and left(d, 2) = '63' then right(d, 10)
        when length(d) >= 11 and left(d, 1) = '0' then right(d, 10)
        when length(d) >= 10 then right(d, 10)
        else d
      end
      from (select regexp_replace(p, '\D', '', 'g') as d) s
    )
  end;
$$;

create or replace function public.csr_mask_phone(p text)
returns text
language sql
immutable
as $$
  select case
    when length(public.csr_norm_phone(p)) < 4 then '****'
    else '******' || right(public.csr_norm_phone(p), 4)
  end;
$$;

create or replace function public.csr_lookup_patients(
  p_phone text,
  p_branch_id uuid default null
)
returns table (
  id uuid,
  full_name text,
  phone_masked text,
  preferred_branch_id uuid,
  is_existing boolean,
  registered_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_key text := public.csr_norm_phone(p_phone);
begin
  if not public.is_csr_marketing()
     and not public.is_hq()
     and not public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN']) then
    raise exception 'not authorized';
  end if;

  if v_key = '' or length(v_key) < 7 then
    return;
  end if;

  if p_branch_id is not null
     and public.is_csr_marketing()
     and p_branch_id not in (select public.user_csr_branch_ids()) then
    raise exception 'branch not assigned to CSR';
  end if;

  return query
  select
    c.id,
    c.full_name,
    public.csr_mask_phone(c.phone) as phone_masked,
    c.preferred_branch_id,
    (
      exists (
        select 1 from public.appointments a
        where a.client_id = c.id
          and a.status not in ('cancelled')
      )
      or coalesce(c.total_visits, 0) > 0
    ) as is_existing,
    c.registered_at
  from public.clients c
  where public.csr_norm_phone(c.phone) = v_key
    and (
      public.is_hq()
      or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
      or c.preferred_branch_id is null
      or c.preferred_branch_id in (select public.user_csr_branch_ids())
      or (
        p_branch_id is not null
        and c.preferred_branch_id = p_branch_id
      )
    )
  order by c.registered_at desc nulls last
  limit 20;
end;
$$;

revoke all on function public.csr_lookup_patients(text, uuid) from public;
grant execute on function public.csr_lookup_patients(text, uuid) to authenticated, service_role;

create or replace function public.csr_register_limited_client(
  p_full_name text,
  p_phone text,
  p_branch_id uuid,
  p_lead_source text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := public.csr_norm_phone(p_phone);
  v_existing uuid;
  v_id uuid;
  v_code text;
begin
  if not public.is_csr_marketing()
     and not public.is_hq()
     and not public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN']) then
    raise exception 'not authorized';
  end if;

  if coalesce(trim(p_full_name), '') = '' then
    raise exception 'full_name is required';
  end if;
  if v_key = '' or length(v_key) < 7 then
    raise exception 'valid mobile number is required';
  end if;
  if p_branch_id is null then
    raise exception 'branch_id is required';
  end if;
  if public.is_csr_marketing()
     and p_branch_id not in (select public.user_csr_branch_ids()) then
    raise exception 'branch not assigned to CSR';
  end if;

  -- Duplicate detection by normalized mobile
  select c.id into v_existing
  from public.clients c
  where public.csr_norm_phone(c.phone) = v_key
  order by c.registered_at desc nulls last
  limit 1;

  if v_existing is not null then
    return v_existing;
  end if;

  v_id := gen_random_uuid();
  v_code := 'MJ-CSR-' || upper(substr(replace(v_id::text, '-', ''), 1, 8));

  insert into public.clients (
    id, code, full_name, phone, preferred_branch_id, status,
    lead_source, registered_at, total_visits, total_spent, gender
  ) values (
    v_id,
    v_code,
    trim(p_full_name),
    p_phone,
    p_branch_id,
    'active',
    nullif(trim(coalesce(p_lead_source, '')), ''),
    now(),
    0,
    0,
    'prefer_not_to_say'
  );

  return v_id;
end;
$$;

revoke all on function public.csr_register_limited_client(text, text, uuid, text) from public;
grant execute on function public.csr_register_limited_client(text, text, uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. Calendar busy slots (no other-patient PII)
-- ---------------------------------------------------------------------------

create or replace function public.csr_calendar_busy_slots(
  p_branch_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  id uuid,
  branch_id uuid,
  start_at timestamptz,
  end_at timestamptz,
  status text,
  staff_id uuid,
  staff_name text,
  duration_minutes int,
  is_own boolean,
  client_label text,
  treatment_label text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_csr_marketing()
     and not public.is_hq()
     and not public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN', 'BRANCH_ADMIN']) then
    raise exception 'not authorized';
  end if;

  if public.is_csr_marketing()
     and p_branch_id not in (select public.user_csr_branch_ids()) then
    raise exception 'branch not assigned to CSR';
  end if;

  if p_from is null or p_to is null or p_to <= p_from then
    raise exception 'invalid time range';
  end if;

  return query
  select
    a.id,
    a.branch_id,
    a.start_at,
    a.end_at,
    a.status,
    a.staff_id,
    a.staff_name,
    a.duration_minutes,
    (a.created_by = auth.uid()) as is_own,
    case
      when a.created_by = auth.uid() then coalesce(c.full_name, a.client_phone, 'Patient')
      else 'Booked'
    end as client_label,
    case
      when a.created_by = auth.uid() then coalesce(a.treatment_name, t.name, 'Service')
      else 'Occupied'
    end as treatment_label
  from public.appointments a
  left join public.clients c on c.id = a.client_id
  left join public.treatments t on t.id = a.treatment_id
  where a.branch_id = p_branch_id
    and a.start_at < p_to
    and a.end_at > p_from
    and a.status not in ('cancelled')
  order by a.start_at;
end;
$$;

revoke all on function public.csr_calendar_busy_slots(uuid, timestamptz, timestamptz) from public;
grant execute on function public.csr_calendar_busy_slots(uuid, timestamptz, timestamptz) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6. Allow CSR to create bookings via RPC (validates overlap + patient link)
-- ---------------------------------------------------------------------------

create or replace function public.csr_create_booking(
  p_branch_id uuid,
  p_client_id uuid,
  p_treatment_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_staff_id uuid default null,
  p_marketing_source text default null,
  p_marketing_campaign text default null,
  p_booking_notes text default null,
  p_treatment_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := gen_random_uuid();
  v_duration int;
  v_overlap boolean;
  v_allowed_sources text[] := array[
    'Facebook Ads', 'Facebook Groups', 'Instagram', 'TikTok',
    'Website', 'Referral', 'Other'
  ];
begin
  if not public.is_csr_marketing()
     and not public.is_hq()
     and not public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN']) then
    raise exception 'not authorized';
  end if;

  if public.is_csr_marketing()
     and p_branch_id not in (select public.user_csr_branch_ids()) then
    raise exception 'branch not assigned to CSR';
  end if;

  if p_client_id is null or p_start_at is null or p_end_at is null or p_end_at <= p_start_at then
    raise exception 'invalid booking payload';
  end if;

  if not exists (select 1 from public.clients c where c.id = p_client_id) then
    raise exception 'client not found';
  end if;

  if p_marketing_source is not null
     and p_marketing_source <> ''
     and p_marketing_source <> all (v_allowed_sources) then
    raise exception 'invalid marketing_source';
  end if;

  v_duration := greatest(5, round(extract(epoch from (p_end_at - p_start_at)) / 60.0)::int);

  if p_staff_id is not null then
    select exists (
      select 1
      from public.appointments a
      where a.staff_id = p_staff_id
        and a.status not in ('cancelled', 'no_show', 'rescheduled')
        and tstzrange(a.start_at, a.end_at, '[)') && tstzrange(p_start_at, p_end_at, '[)')
    ) into v_overlap;
    if v_overlap then
      raise exception 'overlapping appointment for provider';
    end if;
  end if;

  insert into public.appointments (
    id, client_id, branch_id, treatment_id, staff_id,
    start_at, end_at, duration_minutes, status,
    treatment_name, marketing_source, marketing_campaign, booking_notes,
    lead_source, campaign_promo, notes,
    created_by, updated_by, booking_date
  ) values (
    v_id, p_client_id, p_branch_id, p_treatment_id, p_staff_id,
    p_start_at, p_end_at, v_duration, 'pending',
    p_treatment_name, nullif(trim(coalesce(p_marketing_source, '')), ''),
    nullif(trim(coalesce(p_marketing_campaign, '')), ''),
    nullif(trim(coalesce(p_booking_notes, '')), ''),
    nullif(trim(coalesce(p_marketing_source, '')), ''),
    nullif(trim(coalesce(p_marketing_campaign, '')), ''),
    nullif(trim(coalesce(p_booking_notes, '')), ''),
    auth.uid(), auth.uid(), (p_start_at at time zone 'Asia/Manila')::date
  );

  return v_id;
end;
$$;

revoke all on function public.csr_create_booking(
  uuid, uuid, uuid, timestamptz, timestamptz, uuid, text, text, text, text
) from public;
grant execute on function public.csr_create_booking(
  uuid, uuid, uuid, timestamptz, timestamptz, uuid, text, text, text, text
) to authenticated, service_role;

create or replace function public.csr_reschedule_booking(
  p_appointment_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_staff_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.appointments%rowtype;
  v_overlap boolean;
  v_duration int;
begin
  if not public.is_csr_marketing()
     and not public.is_hq()
     and not public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN', 'BRANCH_ADMIN']) then
    raise exception 'not authorized';
  end if;

  select * into v_row from public.appointments where id = p_appointment_id;
  if not found then
    raise exception 'appointment not found';
  end if;

  if public.is_csr_marketing() then
    if v_row.created_by is distinct from auth.uid() then
      raise exception 'CSR may only reschedule own bookings';
    end if;
    if v_row.branch_id not in (select public.user_csr_branch_ids()) then
      raise exception 'branch not assigned to CSR';
    end if;
  end if;

  if p_end_at <= p_start_at then
    raise exception 'invalid time range';
  end if;

  v_duration := greatest(5, round(extract(epoch from (p_end_at - p_start_at)) / 60.0)::int);

  if coalesce(p_staff_id, v_row.staff_id) is not null then
    select exists (
      select 1
      from public.appointments a
      where a.id <> p_appointment_id
        and a.staff_id = coalesce(p_staff_id, v_row.staff_id)
        and a.status not in ('cancelled', 'no_show', 'rescheduled')
        and tstzrange(a.start_at, a.end_at, '[)') && tstzrange(p_start_at, p_end_at, '[)')
    ) into v_overlap;
    if v_overlap then
      raise exception 'overlapping appointment for provider';
    end if;
  end if;

  update public.appointments
  set
    start_at = p_start_at,
    end_at = p_end_at,
    duration_minutes = v_duration,
    staff_id = coalesce(p_staff_id, staff_id),
    status = case when status = 'cancelled' then status else 'rescheduled' end,
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_appointment_id;
end;
$$;

revoke all on function public.csr_reschedule_booking(uuid, timestamptz, timestamptz, uuid) from public;
grant execute on function public.csr_reschedule_booking(uuid, timestamptz, timestamptz, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7. Extend HQ account assignment RPC allow-list (best-effort; recreate if present)
-- ---------------------------------------------------------------------------

-- Note: upsert_branch_account_assignment lives in prior migrations and lists
-- allowed roles. After this migration, HQ should also call
-- set_csr_branch_assignments(user_id, branch_ids[]) for multi-branch CSR.
-- Frontend will use set_csr_branch_assignments for CSR_MARKETING accounts.
