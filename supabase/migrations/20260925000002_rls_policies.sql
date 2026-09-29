-- Row Level Security policies for Imajica

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.branches enable row level security;
alter table public.clients enable row level security;
alter table public.client_skin_profiles enable row level security;
alter table public.client_notes enable row level security;
alter table public.client_documents enable row level security;
alter table public.client_photos enable row level security;
alter table public.staff enable row level security;
alter table public.appointments enable row level security;
alter table public.treatments enable row level security;
alter table public.packages enable row level security;
alter table public.client_packages enable row level security;
alter table public.inventory_items enable row level security;
alter table public.branch_inventory enable row level security;
alter table public.sales enable row level security;
alter table public.payments enable row level security;
alter table public.commissions enable row level security;
alter table public.payroll_items enable row level security;
alter table public.payroll_periods enable row level security;
alter table public.marketing_campaigns enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.system_settings enable row level security;

-- Profiles: users see self; HQ sees all
create policy profiles_select_self_or_hq on public.profiles
  for select using (id = auth.uid() or public.is_hq());

create policy profiles_update_self on public.profiles
  for update using (id = auth.uid() or public.is_hq());

-- Clients: own record via profile, staff/hq by branch
create policy clients_select on public.clients
  for select using (
    profile_id = auth.uid()
    or public.is_hq()
    or preferred_branch_id in (select public.user_branch_ids())
  );

create policy clients_write_staff on public.clients
  for all using (public.is_hq() or public.has_role(array['BRANCH_ADMIN','RECEPTIONIST','DOCTOR','NURSE','STAFF']));

-- Sensitive notes: stricter
create policy client_notes_select on public.client_notes
  for select using (
    public.is_hq()
    or public.has_role(array['BRANCH_ADMIN','DOCTOR','NURSE'])
  );

-- Appointments
create policy appointments_select on public.appointments
  for select using (
    public.is_hq()
    or branch_id in (select public.user_branch_ids())
    or client_id in (select id from public.clients where profile_id = auth.uid())
  );

create policy appointments_write on public.appointments
  for all using (
    public.is_hq()
    or public.has_role(array['BRANCH_ADMIN','RECEPTIONIST','DOCTOR','NURSE','STAFF','AESTHETICIAN'])
    or client_id in (select id from public.clients where profile_id = auth.uid())
  );

-- Treatments/packages catalog readable by authenticated
create policy treatments_read on public.treatments for select to authenticated using (true);
create policy packages_read on public.packages for select to authenticated using (true);
create policy treatments_write on public.treatments for all using (public.is_hq() or public.has_role(array['BRANCH_ADMIN']));
create policy packages_write on public.packages for all using (public.is_hq() or public.has_role(array['BRANCH_ADMIN']));

-- Inventory / sales / payroll
create policy inventory_staff on public.branch_inventory
  for all using (public.is_hq() or branch_id in (select public.user_branch_ids()));

create policy sales_staff on public.sales
  for all using (public.is_hq() or branch_id in (select public.user_branch_ids()));

create policy payments_staff on public.payments
  for select using (public.is_hq() or public.has_role(array['BRANCH_ADMIN','RECEPTIONIST','HQ_ADMIN','SUPER_ADMIN']));

create policy payroll_restricted on public.payroll_items
  for all using (public.is_hq() or public.has_role(array['SUPER_ADMIN','HQ_ADMIN']));

create policy commissions_restricted on public.commissions
  for select using (
    public.is_hq()
    or staff_id in (select id from public.staff where profile_id = auth.uid())
  );

create policy notifications_own on public.notifications
  for select using (user_id = auth.uid() or public.is_hq());

create policy audit_hq on public.audit_logs
  for select using (public.is_hq());

create policy settings_hq on public.system_settings
  for all using (public.is_hq());
