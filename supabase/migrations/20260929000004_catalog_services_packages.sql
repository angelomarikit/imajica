-- Catalog: Service Management + Package Management fields
-- Aligns with New Service / Service List / New Package / Package List UI

-- Treatments (= clinic services in Catalog)
alter table public.treatments
  add column if not exists sessions int not null default 1,
  add column if not exists default_branch_id uuid references public.branches (id);

comment on column public.treatments.sessions is 'Sessions included when sold as a service offering';
comment on column public.treatments.default_branch_id is 'Primary branch for catalog listing (also use branch_treatments for multi-branch)';

create index if not exists treatments_branch_status_idx
  on public.treatments (default_branch_id, status);

-- Packages catalog extras
alter table public.packages
  add column if not exists default_branch_id uuid references public.branches (id),
  add column if not exists free_items text;

comment on column public.packages.free_items is 'Complimentary items/services text from Package Management form';
comment on column public.packages.default_branch_id is 'Primary branch shown on package list';

create index if not exists packages_branch_status_idx
  on public.packages (default_branch_id, status);

-- Ensure package_items supports quantity already (from init); document for inclusions UI
comment on table public.package_items is 'Package inclusions — selected services/treatments from New Package form';

-- Products placeholder (retail) — separate from treatment services; inventory_items already exists.
-- Promotions catalog can reuse marketing_campaigns + landing_promos; add link table later if needed.

-- RLS: staff can manage catalog write (reinforce)
drop policy if exists treatments_write on public.treatments;
create policy treatments_write on public.treatments
  for all
  using (public.is_hq() or public.has_role(array['BRANCH_ADMIN','HQ_ADMIN','SUPER_ADMIN','RECEPTIONIST']));

drop policy if exists packages_write on public.packages;
create policy packages_write on public.packages
  for all
  using (public.is_hq() or public.has_role(array['BRANCH_ADMIN','HQ_ADMIN','SUPER_ADMIN','RECEPTIONIST']));

drop policy if exists package_items_staff on public.package_items;
create policy package_items_staff on public.package_items
  for all
  using (public.is_hq() or public.has_role(array['BRANCH_ADMIN','HQ_ADMIN','SUPER_ADMIN','RECEPTIONIST']));

alter table public.package_items enable row level security;
