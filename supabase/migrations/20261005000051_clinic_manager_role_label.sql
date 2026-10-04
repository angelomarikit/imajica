-- Product name: BRANCH_ADMIN is displayed as Clinic Manager.
-- Keep role id BRANCH_ADMIN so Auth, user_roles, and RLS policies stay valid.

update public.roles
set description = 'Clinic Manager'
where id = 'BRANCH_ADMIN';
