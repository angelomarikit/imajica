-- Fix: after double Time In, employees could not Time Out.
-- canTimeOut = more Time Ins than Time Outs today (not only "last punch is Time In").

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
  v_time_in_count int;
  v_time_out_count int;
  v_can_in boolean;
  v_can_out boolean;
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

  select
    count(*) filter (where punch_type = 'time_in'),
    count(*) filter (where punch_type = 'time_out')
  into v_time_in_count, v_time_out_count
  from public.staff_attendance_logs
  where user_id = v_profile.id
    and (punched_at at time zone 'Asia/Manila')::date
      = (now() at time zone 'Asia/Manila')::date;

  v_can_in := coalesce(v_time_in_count, 0) = 0;
  -- Unmatched Time In(s) → still allow Time Out (covers double Time In)
  v_can_out := coalesce(v_time_in_count, 0) > coalesce(v_time_out_count, 0);

  return jsonb_build_object(
    'ok', true,
    'userId', v_profile.id,
    'fullName', v_profile.full_name,
    'employeeCode', v_code,
    'branchId', v_branch_id,
    'branchName', coalesce(v_branch_name, 'Branch'),
    'role', coalesce(v_role, 'STAFF'),
    'canTimeIn', v_can_in,
    'canTimeOut', v_can_out
  );
end;
$kiosk_lookup$;

revoke all on function public.kiosk_lookup_employee(text) from public;
grant execute on function public.kiosk_lookup_employee(text) to anon, authenticated;
