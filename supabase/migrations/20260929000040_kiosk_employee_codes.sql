-- Kiosk timeclock: employee numbers + public punch RPC (no login)

alter table public.profiles
  add column if not exists employee_code text;

comment on column public.profiles.employee_code is
  'Shared kiosk Time In / Out identifier (e.g. 023). Unique when set.';

create unique index if not exists profiles_employee_code_uidx
  on public.profiles (employee_code)
  where employee_code is not null and employee_code <> '';

-- ---------------------------------------------------------------------------
-- Seed kiosk STAFF accounts (@imajica.com) with employee codes
-- Password: Imajica123
-- ---------------------------------------------------------------------------

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- Reuse helper from migration 35 when present; otherwise define a local equivalent
create or replace function public._seed_team_auth_user(
  p_id uuid,
  p_email text,
  p_password text,
  p_full_name text,
  p_role_id text,
  p_branch_id uuid
) returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_uid uuid;
  v_hash text;
begin
  v_hash := extensions.crypt(p_password, extensions.gen_salt('bf'::text));

  select id into v_uid from auth.users where id = p_id or lower(email) = lower(p_email) limit 1;

  if v_uid is not null then
    update auth.users
      set encrypted_password = v_hash,
          email_confirmed_at = coalesce(email_confirmed_at, now()),
          raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
            || jsonb_build_object('full_name', p_full_name, 'role', p_role_id),
          updated_at = now()
    where id = v_uid;
  else
    v_uid := p_id;
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_uid,
      'authenticated',
      'authenticated',
      lower(p_email),
      v_hash,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', p_full_name, 'role', p_role_id),
      now(), now(),
      '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) values (
      v_uid, v_uid,
      jsonb_build_object('sub', v_uid::text, 'email', lower(p_email)),
      'email', v_uid::text, now(), now(), now()
    )
    on conflict do nothing;
  end if;

  insert into public.profiles (id, full_name, email, status)
  values (v_uid, p_full_name, lower(p_email), 'active')
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email,
        status = 'active',
        updated_at = now();

  insert into public.user_roles (user_id, role_id, branch_id)
  values (v_uid, p_role_id, p_branch_id)
  on conflict do nothing;
end;
$$;

create or replace function public._seed_kiosk_staff(
  p_id uuid,
  p_email text,
  p_password text,
  p_full_name text,
  p_employee_code text,
  p_branch_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._seed_team_auth_user(
    p_id, p_email, p_password, p_full_name, 'STAFF', p_branch_id
  );
  update public.profiles
    set employee_code = lpad(regexp_replace(p_employee_code, '\D', '', 'g'), 3, '0'),
        updated_at = now()
  where id = p_id
     or lower(email) = lower(p_email);
end;
$$;

revoke all on function public._seed_kiosk_staff(uuid, text, text, text, text, uuid) from public;

insert into public.branches (
  id, name, code, address, phone, email, status, is_main, branch_type,
  treatment_rooms, consultation_rooms, waiting_areas, parking_available
)
values
  ('22222222-2222-2222-2222-222222222201'::uuid, 'San Mateo, Rizal', 'BR01', 'San Mateo, Rizal', null, null, 'active', true, 'company_owned', 0, 0, 0, false),
  ('22222222-2222-2222-2222-222222222202'::uuid, 'Cainta, Rizal', 'BR02', 'Cainta, Rizal', null, null, 'active', false, 'company_owned', 0, 0, 0, false),
  ('22222222-2222-2222-2222-222222222203'::uuid, 'Pasig City', 'BR03', 'Pasig City', null, null, 'active', false, 'company_owned', 0, 0, 0, false)
on conflict (id) do nothing;

select public._seed_kiosk_staff('44444444-4444-4444-4444-000000000001'::uuid, 'veronica.mayo@imajica.com', 'Imajica123', 'Veronica Mayo', '002', '22222222-2222-2222-2222-222222222202'::uuid);
select public._seed_kiosk_staff('44444444-4444-4444-4444-000000000002'::uuid, 'samerah.sandigan@imajica.com', 'Imajica123', 'Samerah Sandigan', '007', '22222222-2222-2222-2222-222222222201'::uuid);
select public._seed_kiosk_staff('44444444-4444-4444-4444-000000000003'::uuid, 'sonayah.arsila@imajica.com', 'Imajica123', 'Sonayah Arsila', '008', '22222222-2222-2222-2222-222222222201'::uuid);
select public._seed_kiosk_staff('44444444-4444-4444-4444-000000000004'::uuid, 'noraisa.unayan@imajica.com', 'Imajica123', 'Noraisa Unayan', '010', '22222222-2222-2222-2222-222222222201'::uuid);
select public._seed_kiosk_staff('44444444-4444-4444-4444-000000000005'::uuid, 'sitti.nur.aisa.tan@imajica.com', 'Imajica123', 'Sitti Nur Aisa Tan', '012', '22222222-2222-2222-2222-222222222201'::uuid);
select public._seed_kiosk_staff('44444444-4444-4444-4444-000000000006'::uuid, 'melissa.gervacio@imajica.com', 'Imajica123', 'Melissa Gervacio', '014', '22222222-2222-2222-2222-222222222202'::uuid);
select public._seed_kiosk_staff('44444444-4444-4444-4444-000000000007'::uuid, 'hendra.sandigan@imajica.com', 'Imajica123', 'Hendra Sandigan', '017', '22222222-2222-2222-2222-222222222203'::uuid);
select public._seed_kiosk_staff('44444444-4444-4444-4444-000000000008'::uuid, 'heidi.reyes@imajica.com', 'Imajica123', 'Heidi Reyes', '022', '22222222-2222-2222-2222-222222222202'::uuid);
select public._seed_kiosk_staff('44444444-4444-4444-4444-000000000009'::uuid, 'janice.aguirre@imajica.com', 'Imajica123', 'Janice Aguirre', '023', '22222222-2222-2222-2222-222222222201'::uuid);
select public._seed_kiosk_staff('44444444-4444-4444-4444-000000000010'::uuid, 'annie.barba@imajica.com', 'Imajica123', 'Annie Barba', '024', '22222222-2222-2222-2222-222222222203'::uuid);
select public._seed_kiosk_staff('44444444-4444-4444-4444-000000000011'::uuid, 'chloe.renee.francisco@imajica.com', 'Imajica123', 'Chloe Renee Francisco', '025', '22222222-2222-2222-2222-222222222202'::uuid);
select public._seed_kiosk_staff('44444444-4444-4444-4444-000000000012'::uuid, 'sapiya.lomodah@imajica.com', 'Imajica123', 'Sapiya Lomodah', '026', '22222222-2222-2222-2222-222222222201'::uuid);
select public._seed_kiosk_staff('44444444-4444-4444-4444-000000000013'::uuid, 'ynyr.collene.bandoquillo@imajica.com', 'Imajica123', 'Ynyr Collene Bandoquillo', '027', '22222222-2222-2222-2222-222222222201'::uuid);

create or replace function public.kiosk_lookup_employee(p_employee_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_profile public.profiles%rowtype;
  v_branch_id uuid;
  v_branch_name text;
  v_role text;
  v_last_type text;
  v_open boolean;
begin
  v_code := lpad(regexp_replace(coalesce(p_employee_code, ''), '\D', '', 'g'), 3, '0');
  if v_code is null or v_code = '' or v_code = '000' then
    return jsonb_build_object('ok', false, 'error', 'Enter your employee number');
  end if;

  select * into v_profile
  from public.profiles
  where employee_code = v_code
    and coalesce(status, 'active') = 'active'
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Employee number not found');
  end if;

  select ur.branch_id, ur.role_id, b.name
    into v_branch_id, v_role, v_branch_name
  from public.user_roles ur
  left join public.branches b on b.id = ur.branch_id
  where ur.user_id = v_profile.id
  order by case when ur.role_id = 'STAFF' then 0 else 1 end
  limit 1;

  select punch_type into v_last_type
  from public.staff_attendance_logs
  where user_id = v_profile.id
    and (punched_at at time zone 'Asia/Manila')::date
      = (now() at time zone 'Asia/Manila')::date
  order by punched_at desc
  limit 1;

  v_open := coalesce(v_last_type, '') = 'time_in';

  return jsonb_build_object(
    'ok', true,
    'userId', v_profile.id,
    'fullName', v_profile.full_name,
    'employeeCode', v_code,
    'branchId', v_branch_id,
    'branchName', coalesce(v_branch_name, 'Branch'),
    'role', coalesce(v_role, 'STAFF'),
    'canTimeIn', not v_open,
    'canTimeOut', v_open
  );
end;
$$;

create or replace function public.kiosk_attendance_punch(
  p_employee_code text,
  p_punch_type text,
  p_latitude numeric,
  p_longitude numeric,
  p_accuracy_m numeric default null,
  p_location_label text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lookup jsonb;
  v_user_id uuid;
  v_branch_id uuid;
  v_can_in boolean;
  v_can_out boolean;
  v_row public.staff_attendance_logs%rowtype;
begin
  if p_punch_type not in ('time_in', 'time_out') then
    return jsonb_build_object('ok', false, 'error', 'Invalid punch type');
  end if;
  if p_latitude is null or p_longitude is null then
    return jsonb_build_object('ok', false, 'error', 'Location is required');
  end if;

  v_lookup := public.kiosk_lookup_employee(p_employee_code);
  if coalesce((v_lookup->>'ok')::boolean, false) is not true then
    return v_lookup;
  end if;

  v_user_id := (v_lookup->>'userId')::uuid;
  v_branch_id := nullif(v_lookup->>'branchId', '')::uuid;
  v_can_in := coalesce((v_lookup->>'canTimeIn')::boolean, false);
  v_can_out := coalesce((v_lookup->>'canTimeOut')::boolean, false);

  if v_branch_id is null then
    return jsonb_build_object('ok', false, 'error', 'No branch assigned to this employee');
  end if;

  if p_punch_type = 'time_in' and not v_can_in then
    return jsonb_build_object('ok', false, 'error', 'Already timed in. Please Time Out first.');
  end if;
  if p_punch_type = 'time_out' and not v_can_out then
    return jsonb_build_object('ok', false, 'error', 'Time In is required before Time Out.');
  end if;

  insert into public.staff_attendance_logs (
    user_id, branch_id, punch_type, punched_at,
    photo_url, latitude, longitude, accuracy_m, location_label
  ) values (
    v_user_id, v_branch_id, p_punch_type, now(),
    null, p_latitude, p_longitude, p_accuracy_m, nullif(trim(coalesce(p_location_label, '')), '')
  )
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'id', v_row.id,
    'fullName', v_lookup->>'fullName',
    'employeeCode', v_lookup->>'employeeCode',
    'punchType', v_row.punch_type,
    'punchedAt', v_row.punched_at,
    'branchName', v_lookup->>'branchName',
    'locationLabel', v_row.location_label
  );
end;
$$;

revoke all on function public.kiosk_lookup_employee(text) from public;
revoke all on function public.kiosk_attendance_punch(text, text, numeric, numeric, numeric, text) from public;
grant execute on function public.kiosk_lookup_employee(text) to anon, authenticated;
grant execute on function public.kiosk_attendance_punch(text, text, numeric, numeric, numeric, text) to anon, authenticated;
