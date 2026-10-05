-- HR / people-ops may correct Time In / Time Out timestamps and add missing punches

grant update on public.staff_attendance_logs to authenticated;

drop policy if exists staff_attendance_logs_update_people_ops on public.staff_attendance_logs;
create policy staff_attendance_logs_update_people_ops
  on public.staff_attendance_logs for update to authenticated
  using (public.is_people_ops())
  with check (public.is_people_ops());

drop policy if exists staff_attendance_logs_insert_people_ops on public.staff_attendance_logs;
create policy staff_attendance_logs_insert_people_ops
  on public.staff_attendance_logs for insert to authenticated
  with check (public.is_people_ops());

-- HR may also remove a wrong punch when fixing attendance
drop policy if exists staff_attendance_logs_delete_own on public.staff_attendance_logs;
create policy staff_attendance_logs_delete_own
  on public.staff_attendance_logs for delete to authenticated
  using (
    user_id = auth.uid()
    or public.is_people_ops()
  );

comment on policy staff_attendance_logs_update_people_ops on public.staff_attendance_logs is
  'HQ and HR may correct punched_at on attendance logs';

comment on policy staff_attendance_logs_insert_people_ops on public.staff_attendance_logs is
  'HQ and HR may insert corrective punches (e.g. missing Time Out)';
