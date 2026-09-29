-- Team → User Access (Create User Account + User Accounts Directory)
-- Aligns with profiles / user_roles / roles / branches already in init schema

alter table public.profiles
  add column if not exists status text not null default 'active'
    check (status in ('active', 'inactive'));

create index if not exists profiles_status_idx on public.profiles (status);
create index if not exists profiles_email_idx on public.profiles (email);

comment on column public.profiles.status is
  'User Accounts Directory active toggle (not auth ban — application-level)';

-- Directory view used by Users List UI
create or replace view public.v_user_access_directory as
select
  p.id,
  p.full_name,
  p.email,
  p.phone,
  p.status,
  p.avatar_url,
  p.created_at,
  ur.role_id,
  ur.branch_id,
  b.name as branch_name
from public.profiles p
left join lateral (
  select ur2.role_id, ur2.branch_id
  from public.user_roles ur2
  where ur2.user_id = p.id
  order by
    case when ur2.role_id = 'SUPER_ADMIN' then 0 else 1 end,
    ur2.role_id
  limit 1
) ur on true
left join public.branches b on b.id = ur.branch_id
where coalesce(ur.role_id, '') <> 'CLIENT'
   or ur.role_id is null;

comment on view public.v_user_access_directory is
  'Team → User Access → Users List (staff/admin accounts)';

grant select on public.v_user_access_directory to authenticated;

-- Toggle application status (does not delete auth user)
create or replace function public.set_profile_active(
  p_user_id uuid,
  p_active boolean
) returns void
language plpgsql
security invoker
as $$
begin
  if not (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN'])
  ) then
    raise exception 'not authorized';
  end if;

  update public.profiles
  set
    status = case when p_active then 'active' else 'inactive' end,
    updated_at = now()
  where id = p_user_id;
end;
$$;

grant execute on function public.set_profile_active(uuid, boolean) to authenticated;

/*
  Create User Account (app flow when Supabase is connected):

  1) auth.admin.createUser({ email, password, email_confirm: true })
     — or inviteUserByEmail — via Edge Function with service role
  2) insert into public.profiles (id, full_name, email, status)
     values (new_user_id, :full_name, :email, 'active');
  3) insert into public.user_roles (user_id, role_id, branch_id)
     values (new_user_id, :role_id, :branch_id);  -- branch_id null = HQ / No Branch

  Example SQL after auth user exists ($1 = auth.users.id):

  insert into public.profiles (id, full_name, email, status)
  values ($1, 'Annie Barba', 'annieba560@gmail.com', 'active')
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email,
        updated_at = now();

  insert into public.user_roles (user_id, role_id, branch_id)
  values ($1, 'BRANCH_ADMIN', '11111111-1111-1111-1111-111111111101')
  on conflict do nothing;

  -- Directory query
  select * from public.v_user_access_directory
  where full_name ilike '%' || :q || '%'
  order by full_name
  limit :limit offset :offset;

  -- Toggle
  select public.set_profile_active(:user_id, true);
*/
