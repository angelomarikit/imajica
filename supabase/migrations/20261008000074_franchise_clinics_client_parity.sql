-- Franchise clinics (Dasmariñas FR01, Bacoor FR02) are first-class clinic locations
-- for clients, appointments, and sales — same preferred_branch_id scoping as company-owned.
-- user_clinic_branch_ids() already includes franchise (excludes warehouse only).

update public.branches
set
  status = 'active',
  branch_type = 'franchise',
  updated_at = now()
where id in (
  '22222222-2222-2222-2222-222222222205'::uuid, -- Dasmariñas, Cavite
  '22222222-2222-2222-2222-222222222206'::uuid  -- Bacoor, Cavite
);

comment on column public.clients.preferred_branch_id is
  'Home clinic UUID — company-owned or franchise (FR01 Dasma / FR02 Bacoor included).';
