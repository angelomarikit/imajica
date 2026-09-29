-- Team → Branches (Create New Branch + Branch Directory)
-- Extends public.branches from init schema

alter table public.branches
  add column if not exists branch_type text not null default 'company_owned'
    check (branch_type in ('company_owned', 'franchise', 'warehouse'));

create index if not exists branches_code_idx on public.branches (code);
create index if not exists branches_type_idx on public.branches (branch_type);
create index if not exists branches_status_idx on public.branches (status);

comment on column public.branches.branch_type is
  'Create New Branch — company_owned | franchise | warehouse';
comment on column public.branches.code is
  'Branch Directory code (BR01, FR01, WAREHOUSE, …)';

-- Toggle active status from Branch Directory switch
create or replace function public.set_branch_active(
  p_branch_id uuid,
  p_active boolean
) returns void
language plpgsql
security invoker
as $$
begin
  if not (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN'])
  ) then
    raise exception 'not authorized';
  end if;

  update public.branches
  set
    status = case when p_active then 'active' else 'inactive' end,
    updated_at = now()
  where id = p_branch_id;
end;
$$;

grant execute on function public.set_branch_active(uuid, boolean) to authenticated;

/*
  Create New Branch:

  insert into public.branches (
    name, code, branch_type, address, status, is_main
  ) values (
    'San Mateo, Rizal',
    'BR01',
    'company_owned',
    '2F RSJ Building, 67 Gen. Luna St., Ampid 1, San Mateo, Rizal',
    'active',
    false
  );

  -- Branch Directory list
  select id, code, name, branch_type, address, status
  from public.branches
  where code ilike '%' || :q || '%'
     or name ilike '%' || :q || '%'
  order by code
  limit :limit offset :offset;

  -- Toggle
  select public.set_branch_active(:branch_id, true);
*/
