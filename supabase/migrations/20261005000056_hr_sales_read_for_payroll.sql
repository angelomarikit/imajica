-- HR needs org-wide sales visibility to compute staff commissions on payslips.
-- Previously sales RLS only allowed is_hq() / branch-scoped clinic roles — not is_people_ops().

drop policy if exists sales_staff on public.sales;
create policy sales_staff on public.sales
  for all
  to authenticated
  using (
    public.is_hq()
    or public.is_people_ops()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or branch_id in (select public.user_branch_ids())
    or branch_id in (select public.user_clinic_branch_ids())
  )
  with check (
    public.is_hq()
    or public.is_people_ops()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or branch_id in (select public.user_branch_ids())
    or branch_id in (select public.user_clinic_branch_ids())
  );

comment on policy sales_staff on public.sales is
  'HQ, HR/people-ops, and clinic staff can access sales for payroll commissions and booking checkout';

drop policy if exists sale_items_staff on public.sale_items;
create policy sale_items_staff on public.sale_items
  for all
  to authenticated
  using (
    public.is_hq()
    or public.is_people_ops()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or exists (
      select 1
      from public.sales s
      where s.id = sale_id
        and (
          public.is_hq()
          or public.is_people_ops()
          or s.branch_id in (select public.user_branch_ids())
          or s.branch_id in (select public.user_clinic_branch_ids())
        )
    )
  )
  with check (
    public.is_hq()
    or public.is_people_ops()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or exists (
      select 1
      from public.sales s
      where s.id = sale_id
        and (
          public.is_hq()
          or public.is_people_ops()
          or s.branch_id in (select public.user_branch_ids())
          or s.branch_id in (select public.user_clinic_branch_ids())
        )
    )
  );

drop policy if exists payments_staff on public.payments;
create policy payments_staff on public.payments
  for all
  to authenticated
  using (
    public.is_hq()
    or public.is_people_ops()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or exists (
      select 1
      from public.sales s
      where s.id = sale_id
        and (
          public.is_hq()
          or public.is_people_ops()
          or s.branch_id in (select public.user_branch_ids())
          or s.branch_id in (select public.user_clinic_branch_ids())
        )
    )
  )
  with check (
    public.is_hq()
    or public.is_people_ops()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or exists (
      select 1
      from public.sales s
      where s.id = sale_id
        and (
          public.is_hq()
          or public.is_people_ops()
          or s.branch_id in (select public.user_branch_ids())
          or s.branch_id in (select public.user_clinic_branch_ids())
        )
    )
  );
