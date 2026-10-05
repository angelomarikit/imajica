-- Allow HR / people-ops to remove released payslips (e.g. after miscalculation)

drop policy if exists employee_payslips_delete on public.employee_payslips;
create policy employee_payslips_delete
  on public.employee_payslips for delete to authenticated
  using (public.is_people_ops());

grant delete on public.employee_payslips to authenticated;
