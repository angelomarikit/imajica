-- CSR Marketing intake booking: match field team collection form
-- Full Name, Contact Number, Address, Email, Skin/Body Concern,
-- Preferred Procedure, Time, Branch → one RPC creates/links client + appointment.

drop function if exists public.csr_register_limited_client(text, text, uuid, text);

create or replace function public.csr_register_limited_client(
  p_full_name text,
  p_phone text,
  p_branch_id uuid,
  p_lead_source text default null,
  p_email text default null,
  p_address text default null,
  p_skin_concern text default null
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
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_address text := nullif(trim(coalesce(p_address, '')), '');
  v_concern text := nullif(trim(coalesce(p_skin_concern, '')), '');
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

  select c.id into v_existing
  from public.clients c
  where public.csr_norm_phone(c.phone) = v_key
  order by c.registered_at desc nulls last
  limit 1;

  if v_existing is not null then
    update public.clients
    set
      preferred_branch_id = coalesce(preferred_branch_id, p_branch_id),
      email = coalesce(v_email, email),
      address = coalesce(v_address, address),
      medical_concerns = case
        when v_concern is null then medical_concerns
        when coalesce(medical_concerns, '') = '' then v_concern
        when position(v_concern in medical_concerns) > 0 then medical_concerns
        else medical_concerns || E'\n' || v_concern
      end,
      lead_source = coalesce(nullif(trim(coalesce(p_lead_source, '')), ''), lead_source),
      updated_at = now()
    where id = v_existing;
    return v_existing;
  end if;

  v_id := gen_random_uuid();
  v_code := 'MJ-CSR-' || upper(substr(replace(v_id::text, '-', ''), 1, 8));

  insert into public.clients (
    id, code, full_name, phone, email, address, medical_concerns,
    preferred_branch_id, status, lead_source, registered_at,
    total_visits, total_spent, gender
  ) values (
    v_id,
    v_code,
    trim(p_full_name),
    p_phone,
    v_email,
    v_address,
    v_concern,
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

revoke all on function public.csr_register_limited_client(text, text, uuid, text, text, text, text) from public;
grant execute on function public.csr_register_limited_client(text, text, uuid, text, text, text, text) to authenticated, service_role;

-- One-shot intake: client fields + preferred procedure + time + branch
create or replace function public.csr_create_intake_booking(
  p_full_name text,
  p_phone text,
  p_branch_id uuid,
  p_start_at timestamptz,
  p_address text default null,
  p_email text default null,
  p_skin_concern text default null,
  p_preferred_procedure text default null,
  p_duration_minutes int default 60,
  p_marketing_source text default 'Other',
  p_marketing_campaign text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
  v_appt_id uuid := gen_random_uuid();
  v_treatment_id uuid;
  v_treatment_name text;
  v_duration int;
  v_end timestamptz;
  v_notes text;
  v_source text := coalesce(nullif(trim(p_marketing_source), ''), 'Other');
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

  if p_start_at is null then
    raise exception 'time is required';
  end if;

  if v_source <> all (v_allowed_sources) then
    raise exception 'invalid marketing_source';
  end if;

  v_client_id := public.csr_register_limited_client(
    p_full_name,
    p_phone,
    p_branch_id,
    v_source,
    p_email,
    p_address,
    p_skin_concern
  );

  v_treatment_name := nullif(trim(coalesce(p_preferred_procedure, '')), '');
  if v_treatment_name is not null then
    select t.id into v_treatment_id
    from public.treatments t
    where t.status = 'active'
      and lower(trim(t.name)) = lower(v_treatment_name)
      and (t.default_branch_id is null or t.default_branch_id = p_branch_id)
    order by t.name
    limit 1;

    if v_treatment_id is null then
      select t.id, t.name into v_treatment_id, v_treatment_name
      from public.treatments t
      where t.status = 'active'
        and lower(t.name) like '%' || lower(v_treatment_name) || '%'
        and (t.default_branch_id is null or t.default_branch_id = p_branch_id)
      order by length(t.name)
      limit 1;
    end if;
  end if;

  if v_treatment_id is not null then
    select coalesce(t.duration_minutes, greatest(15, coalesce(p_duration_minutes, 60)))
    into v_duration
    from public.treatments t
    where t.id = v_treatment_id;
    select t.name into v_treatment_name from public.treatments t where t.id = v_treatment_id;
  else
    v_duration := greatest(15, coalesce(p_duration_minutes, 60));
  end if;

  v_end := p_start_at + make_interval(mins => v_duration);

  v_notes := nullif(
    trim(
      concat_ws(
        E'\n',
        case when nullif(trim(coalesce(p_skin_concern, '')), '') is not null
          then 'Skin/Body Concern: ' || trim(p_skin_concern) end,
        case when v_treatment_name is not null
          then 'Preferred Procedure: ' || v_treatment_name end
      )
    ),
    ''
  );

  insert into public.appointments (
    id, client_id, branch_id, treatment_id, staff_id,
    start_at, end_at, duration_minutes, status,
    treatment_name, marketing_source, marketing_campaign, booking_notes,
    lead_source, campaign_promo, notes, client_phone,
    created_by, updated_by, booking_date
  ) values (
    v_appt_id, v_client_id, p_branch_id, v_treatment_id, null,
    p_start_at, v_end, v_duration, 'pending',
    v_treatment_name, v_source,
    nullif(trim(coalesce(p_marketing_campaign, '')), ''),
    v_notes,
    v_source,
    nullif(trim(coalesce(p_marketing_campaign, '')), ''),
    v_notes,
    p_phone,
    auth.uid(), auth.uid(), (p_start_at at time zone 'Asia/Manila')::date
  );

  return v_appt_id;
end;
$$;

revoke all on function public.csr_create_intake_booking(
  text, text, uuid, timestamptz, text, text, text, text, int, text, text
) from public;
grant execute on function public.csr_create_intake_booking(
  text, text, uuid, timestamptz, text, text, text, text, int, text, text
) to authenticated, service_role;

comment on function public.csr_create_intake_booking is
  'CSR Marketing one-form intake: name, phone, address, email, skin concern, preferred procedure, time, branch';
