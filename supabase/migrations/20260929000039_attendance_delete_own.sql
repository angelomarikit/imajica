-- Allow staff to delete their own attendance punches (accidental Time In / Out)

grant delete on public.staff_attendance_logs to authenticated;

drop policy if exists staff_attendance_logs_delete_own on public.staff_attendance_logs;
create policy staff_attendance_logs_delete_own
  on public.staff_attendance_logs for delete to authenticated
  using (
    user_id = auth.uid()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
  );

comment on policy staff_attendance_logs_delete_own on public.staff_attendance_logs is
  'Staff may delete their own punches; HQ may delete any';
