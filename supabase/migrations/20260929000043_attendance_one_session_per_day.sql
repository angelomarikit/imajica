-- One Time In + one Time Out per Manila calendar day on the shared kiosk.
-- After Time Out, Time In is blocked until the next day.
-- Run this entire file in one go (do not paste only part of it).

create or replace function public.kiosk_lookup_employee(p_employee_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $kiosk_lookup$
declare
  v_code text;
  v_profile public.profiles%rowtype;
  v_branch_id uuid;
  v_branch_name text;
  v_role text;
  v_last_type text;
  v_has_time_in boolean;
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

  select exists (
    select 1
    from public.staff_attendance_logs
    where user_id = v_profile.id
      and punch_type = 'time_in'
      and (punched_at at time zone 'Asia/Manila')::date
        = (now() at time zone 'Asia/Manila')::date
  ) into v_has_time_in;

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
    'canTimeIn', not coalesce(v_has_time_in, false),
    'canTimeOut', v_open
  );
end;
$kiosk_lookup$;

revoke all on function public.kiosk_lookup_employee(text) from public;
grant execute on function public.kiosk_lookup_employee(text) to anon, authenticated;

create or replace function public.kiosk_attendance_punch(
  p_employee_code text,
  p_punch_type text,
  p_latitude numeric,
  p_longitude numeric,
  p_accuracy_m numeric default null,
  p_location_label text default null,
  p_photo_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $kiosk_punch$
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
  if p_photo_url is null or trim(p_photo_url) = '' then
    return jsonb_build_object('ok', false, 'error', 'Selfie is required');
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
    if v_can_out then
      return jsonb_build_object('ok', false, 'error', 'Already timed in. Please Time Out first.');
    end if;
    return jsonb_build_object(
      'ok', false,
      'error', 'You already completed attendance for today. Try again tomorrow.'
    );
  end if;

  if p_punch_type = 'time_out' and not v_can_out then
    return jsonb_build_object(
      'ok', false,
      'error', 'Time In is required before Time Out (or you already timed out today).'
    );
  end if;

  insert into public.staff_attendance_logs (
    user_id, branch_id, punch_type, punched_at,
    photo_url, latitude, longitude, accuracy_m, location_label
  ) values (
    v_user_id, v_branch_id, p_punch_type, now(),
    trim(p_photo_url), p_latitude, p_longitude, p_accuracy_m,
    nullif(trim(coalesce(p_location_label, '')), '')
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
    'locationLabel', v_row.location_label,
    'photoUrl', v_row.photo_url
  );
end;
$kiosk_punch$;

revoke all on function public.kiosk_attendance_punch(text, text, numeric, numeric, numeric, text, text) from public;
grant execute on function public.kiosk_attendance_punch(text, text, numeric, numeric, numeric, text, text) to anon, authenticated;
