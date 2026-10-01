-- Fix checkout Place Order: clients RLS blocked staff from find-or-create.
-- 1) Align write roles with select (include AESTHETICIAN)
-- 2) Security-definer RPC so booking can reuse existing clients even when SELECT is branch-scoped

drop policy if exists clients_insert_staff on public.clients;
drop policy if exists clients_write_staff on public.clients;

create policy clients_insert_staff on public.clients
  for insert
  to authenticated
  with check (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or (
      public.has_role(array[
        'BRANCH_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE', 'STAFF', 'AESTHETICIAN'
      ])
      and (
        preferred_branch_id is null
        or preferred_branch_id in (select public.user_clinic_branch_ids())
      )
    )
  );

create policy clients_update_staff on public.clients
  for update
  to authenticated
  using (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or (
      public.has_role(array[
        'BRANCH_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE', 'STAFF', 'AESTHETICIAN'
      ])
      and preferred_branch_id is not null
      and preferred_branch_id in (select public.user_clinic_branch_ids())
    )
  )
  with check (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or (
      public.has_role(array[
        'BRANCH_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE', 'STAFF', 'AESTHETICIAN'
      ])
      and preferred_branch_id is not null
      and preferred_branch_id in (select public.user_clinic_branch_ids())
    )
  );

create policy clients_delete_staff on public.clients
  for delete
  to authenticated
  using (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or (
      public.has_role(array['BRANCH_ADMIN'])
      and preferred_branch_id is not null
      and preferred_branch_id in (select public.user_clinic_branch_ids())
    )
  );

-- Find or create a client for booking / checkout (bypasses SELECT branch blind spots)
create or replace function public.ensure_booking_client(
  p_full_name text,
  p_email text default null,
  p_phone text default null,
  p_branch_id uuid default null,
  p_client_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_code text;
  v_row public.clients%rowtype;
  v_email text;
  v_phone text;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Not signed in');
  end if;

  if not (
    public.is_hq()
    or public.has_role(array[
      'SUPER_ADMIN', 'HQ_ADMIN', 'BRANCH_ADMIN', 'RECEPTIONIST',
      'DOCTOR', 'NURSE', 'STAFF', 'AESTHETICIAN'
    ])
  ) then
    return jsonb_build_object('ok', false, 'error', 'Not allowed to create clients');
  end if;

  if p_full_name is null or trim(p_full_name) = '' then
    return jsonb_build_object('ok', false, 'error', 'Client name is required');
  end if;

  v_email := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_phone := nullif(trim(coalesce(p_phone, '')), '');

  if p_client_id is not null then
    select * into v_row from public.clients where id = p_client_id;
    if found then
      if v_row.preferred_branch_id is null and p_branch_id is not null then
        update public.clients
          set preferred_branch_id = p_branch_id, updated_at = now()
          where id = v_row.id;
        v_row.preferred_branch_id := p_branch_id;
      end if;
      return jsonb_build_object(
        'ok', true,
        'id', v_row.id,
        'fullName', v_row.full_name,
        'email', v_row.email,
        'phone', v_row.phone
      );
    end if;
  end if;

  if v_email is not null then
    select * into v_row from public.clients where lower(email) = v_email limit 1;
    if found then
      if v_row.preferred_branch_id is null and p_branch_id is not null then
        update public.clients
          set preferred_branch_id = p_branch_id, updated_at = now()
          where id = v_row.id;
      end if;
      return jsonb_build_object(
        'ok', true,
        'id', v_row.id,
        'fullName', v_row.full_name,
        'email', v_row.email,
        'phone', v_row.phone
      );
    end if;
  end if;

  if v_phone is not null then
    select * into v_row from public.clients where phone = v_phone limit 1;
    if found then
      if v_row.preferred_branch_id is null and p_branch_id is not null then
        update public.clients
          set preferred_branch_id = p_branch_id, updated_at = now()
          where id = v_row.id;
      end if;
      return jsonb_build_object(
        'ok', true,
        'id', v_row.id,
        'fullName', v_row.full_name,
        'email', v_row.email,
        'phone', v_row.phone
      );
    end if;
  end if;

  v_id := gen_random_uuid();
  v_code := 'MJ-' || to_char(now() at time zone 'Asia/Manila', 'YYMMDD')
    || lpad((floor(random() * 10000))::int::text, 4, '0');

  insert into public.clients (
    id, code, full_name, email, phone, preferred_branch_id, gender, status
  ) values (
    v_id,
    v_code,
    trim(p_full_name),
    v_email,
    v_phone,
    p_branch_id,
    'prefer_not_to_say',
    'active'
  )
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'id', v_row.id,
    'fullName', v_row.full_name,
    'email', v_row.email,
    'phone', v_row.phone
  );
exception
  when unique_violation then
    if v_email is not null then
      select * into v_row from public.clients where lower(email) = v_email limit 1;
      if found then
        return jsonb_build_object(
          'ok', true,
          'id', v_row.id,
          'fullName', v_row.full_name,
          'email', v_row.email,
          'phone', v_row.phone
        );
      end if;
    end if;
    return jsonb_build_object('ok', false, 'error', 'Client already exists');
end;
$$;

revoke all on function public.ensure_booking_client(text, text, text, uuid, uuid) from public;
grant execute on function public.ensure_booking_client(text, text, text, uuid, uuid) to authenticated;

comment on function public.ensure_booking_client(text, text, text, uuid, uuid) is
  'Staff checkout/booking: find or create client without RLS SELECT blind spots';
