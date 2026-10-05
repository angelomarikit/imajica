-- Include org-wide HR / Marketing accounts in Branches Accounts directory.
-- They are tagged to the HQ sentinel (All Branches), previously excluded.

drop view if exists public.v_branch_accounts_directory;
create view public.v_branch_accounts_directory as
select
  p.id,
  p.full_name,
  p.email,
  p.phone,
  p.status,
  p.avatar_url,
  p.created_at,
  p.updated_at,
  ur.role_id,
  ur.branch_id,
  case
    when ur.role_id in ('HR', 'MARKETING')
      then 'All Branches (organization)'
    else b.name
  end as branch_name,
  b.code as branch_code,
  b.branch_type,
  p.employee_code
from public.profiles p
inner join lateral (
  select ur2.role_id, ur2.branch_id
  from public.user_roles ur2
  where ur2.user_id = p.id
    and ur2.branch_id is not null
    and ur2.role_id not in ('CLIENT', 'SUPER_ADMIN', 'HQ_ADMIN')
    and (
      -- Clinic staff: real clinic branch
      (
        ur2.branch_id <> '00000000-0000-0000-0000-000000000001'::uuid
        and ur2.role_id not in ('HR', 'MARKETING')
      )
      -- Org-wide people ops / marketing: HQ sentinel
      or ur2.role_id in ('HR', 'MARKETING')
    )
  order by
    case
      when ur2.role_id in ('HR', 'MARKETING') then 0
      when ur2.role_id = 'BRANCH_ADMIN' then 1
      else 2
    end,
    ur2.role_id
  limit 1
) ur on true
inner join public.branches b on b.id = ur.branch_id
where
  ur.role_id in ('HR', 'MARKETING')
  or coalesce(b.branch_type, 'company_owned') <> 'warehouse';

comment on view public.v_branch_accounts_directory is
  'Team → Branches → Branches Accounts — clinic staff + org-wide HR / Marketing (All Branches)';

grant select on public.v_branch_accounts_directory to authenticated;
