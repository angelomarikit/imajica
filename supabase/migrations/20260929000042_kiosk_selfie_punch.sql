-- Kiosk punches require selfie URL; allow anon upload under attendance-selfies/kiosk/

-- Replace punch RPC with photo_url support (drop old signature first)
drop function if exists public.kiosk_attendance_punch(text, text, numeric, numeric, numeric, text);

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
$$;

revoke all on function public.kiosk_attendance_punch(text, text, numeric, numeric, numeric, text, text) from public;
grant execute on function public.kiosk_attendance_punch(text, text, numeric, numeric, numeric, text, text) to anon, authenticated;

-- Allow shared kiosk (anon + authenticated) to upload selfies under kiosk/
drop policy if exists attendance_selfies_kiosk_insert on storage.objects;
create policy attendance_selfies_kiosk_insert
  on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'attendance-selfies'
    and (storage.foldername(name))[1] = 'kiosk'
  );

drop policy if exists attendance_selfies_kiosk_select on storage.objects;
create policy attendance_selfies_kiosk_select
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'attendance-selfies'
    and (
      (storage.foldername(name))[1] = 'kiosk'
      or (storage.foldername(name))[1] = auth.uid()::text
      or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN', 'BRANCH_ADMIN'])
    )
  );
