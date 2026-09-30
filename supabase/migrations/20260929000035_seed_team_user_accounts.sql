-- Seed legacy User List accounts into Auth + profiles + user_roles
-- Password for all: Imajica123
-- Requires: pgcrypto (extensions schema on Supabase), HQ sentinel branch (migration 23), clinic branches
-- Idempotent on fixed user UUIDs / email

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- Ensure clinic branches exist (same UUIDs as seed.sql)
insert into public.branches (
  id, name, code, address, phone, email, status, is_main, branch_type,
  treatment_rooms, consultation_rooms, waiting_areas, parking_available
)
values
  ('22222222-2222-2222-2222-222222222201'::uuid, 'San Mateo, Rizal', 'BR01', 'San Mateo, Rizal', null, null, 'active', true, 'company_owned', 0, 0, 0, false),
  ('22222222-2222-2222-2222-222222222202'::uuid, 'Cainta, Rizal', 'BR02', 'Cainta, Rizal', null, null, 'active', false, 'company_owned', 0, 0, 0, false),
  ('22222222-2222-2222-2222-222222222203'::uuid, 'Pasig City', 'BR03', 'Pasig City', null, null, 'active', false, 'company_owned', 0, 0, 0, false),
  ('22222222-2222-2222-2222-222222222205'::uuid, 'Dasmariñas, Cavite', 'FR01', 'Dasmariñas, Cavite', null, null, 'active', false, 'franchise', 0, 0, 0, false),
  ('22222222-2222-2222-2222-222222222206'::uuid, 'Bacoor, Cavite', 'FR02', 'Bacoor, Cavite', null, null, 'active', false, 'franchise', 0, 0, 0, false)
on conflict (id) do nothing;

create or replace function public._seed_team_auth_user(
  p_id uuid,
  p_email text,
  p_password text,
  p_full_name text,
  p_role_id text,
  p_branch_id uuid
) returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_uid uuid;
  v_hash text;
begin
  -- Qualify pgcrypto explicitly (Supabase installs it under extensions)
  v_hash := extensions.crypt(p_password, extensions.gen_salt('bf'::text));

  select id into v_uid from auth.users where id = p_id or lower(email) = lower(p_email) limit 1;

  if v_uid is not null then
    update auth.users
      set encrypted_password = v_hash,
          email_confirmed_at = coalesce(email_confirmed_at, now()),
          raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
            || jsonb_build_object('full_name', p_full_name, 'role', p_role_id),
          updated_at = now()
    where id = v_uid;
  else
    v_uid := p_id;
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_uid,
      'authenticated',
      'authenticated',
      lower(p_email),
      v_hash,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', p_full_name, 'role', p_role_id),
      now(), now(),
      '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) values (
      v_uid, v_uid,
      jsonb_build_object('sub', v_uid::text, 'email', lower(p_email)),
      'email', v_uid::text, now(), now(), now()
    )
    on conflict do nothing;
  end if;

  insert into public.profiles (id, full_name, email, status)
  values (v_uid, p_full_name, lower(p_email), 'active')
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email,
        status = 'active',
        updated_at = now();

  insert into public.user_roles (user_id, role_id, branch_id)
  values (v_uid, p_role_id, p_branch_id)
  on conflict do nothing;
end;
$$;

revoke all on function public._seed_team_auth_user(uuid, text, text, text, text, uuid) from public;

select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000001'::uuid,
  'imajica-admin@gmail.com',
  'Imajica123',
  'admin',
  'HQ_ADMIN',
  '00000000-0000-0000-0000-000000000001'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000002'::uuid,
  'admin@intra-code.com',
  'Imajica123',
  'admintesting',
  'HQ_ADMIN',
  '00000000-0000-0000-0000-000000000001'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000003'::uuid,
  'annieba560@gmail.com',
  'Imajica123',
  'Annie Barba',
  'BRANCH_ADMIN',
  '22222222-2222-2222-2222-222222222203'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000004'::uuid,
  'bacoor@gmail.com',
  'Imajica123',
  'BACOOR ADMIN',
  'BRANCH_ADMIN',
  '22222222-2222-2222-2222-222222222206'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000005'::uuid,
  'imajicabacoor@gmail.com',
  'Imajica123',
  'Bacoor, Cavite',
  'BRANCH_ADMIN',
  '22222222-2222-2222-2222-222222222206'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000006'::uuid,
  'bridgetteandreasantos@gmail.com',
  'Imajica123',
  'Bridgette',
  'HQ_ADMIN',
  '00000000-0000-0000-0000-000000000001'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000007'::uuid,
  'charisesampaga@gmail.com',
  'Imajica123',
  'Charise',
  'HQ_ADMIN',
  '00000000-0000-0000-0000-000000000001'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000008'::uuid,
  'chloe.francisco11@gmail.com',
  'Imajica123',
  'Chloe Francisco',
  'BRANCH_ADMIN',
  '22222222-2222-2222-2222-222222222202'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000009'::uuid,
  'companerodhey@gmail.com',
  'Imajica123',
  'Daisy A. Compañero',
  'BRANCH_ADMIN',
  '22222222-2222-2222-2222-222222222205'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000010'::uuid,
  'dasma@gmail.com',
  'Imajica123',
  'DASMA ADMIN',
  'BRANCH_ADMIN',
  '22222222-2222-2222-2222-222222222205'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000011'::uuid,
  'imajicadasmarinas@gmail.com',
  'Imajica123',
  'Dasmariñas, Cavite',
  'BRANCH_ADMIN',
  '22222222-2222-2222-2222-222222222205'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000012'::uuid,
  'francescruzph.pro@gmail.com',
  'Imajica123',
  'Frances',
  'HQ_ADMIN',
  '00000000-0000-0000-0000-000000000001'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000013'::uuid,
  'hydsreyes1220@gmail.com',
  'Imajica123',
  'Heidi Tiamzon Reyes',
  'BRANCH_ADMIN',
  '22222222-2222-2222-2222-222222222202'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000014'::uuid,
  'hendrasukol98@gmail.com',
  'Imajica123',
  'Hendra Sandigan',
  'BRANCH_ADMIN',
  '22222222-2222-2222-2222-222222222203'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000015'::uuid,
  'lloydmichaelpatenia@gmail.com',
  'Imajica123',
  'INACTIVE',
  'HQ_ADMIN',
  '00000000-0000-0000-0000-000000000001'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000016'::uuid,
  'afundarvaneza@gmail.com',
  'Imajica123',
  'INACTIVE',
  'HQ_ADMIN',
  '00000000-0000-0000-0000-000000000001'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000017'::uuid,
  'nicoletexon@gmail.com',
  'Imajica123',
  'INACTIVE',
  'HQ_ADMIN',
  '00000000-0000-0000-0000-000000000001'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000018'::uuid,
  'sherlenejorda@gmail.com',
  'Imajica123',
  'INACTIVE',
  'HQ_ADMIN',
  '00000000-0000-0000-0000-000000000001'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000019'::uuid,
  'rozelynperocho@gmail.com',
  'Imajica123',
  'INACTIVE',
  'HQ_ADMIN',
  '00000000-0000-0000-0000-000000000001'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000020'::uuid,
  'melksto.domingo@gmail.com',
  'Imajica123',
  'INACTIVE',
  'HQ_ADMIN',
  '00000000-0000-0000-0000-000000000001'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000021'::uuid,
  'jadeaguirre47@gmail.com',
  'Imajica123',
  'Janice B. Aguirre',
  'BRANCH_ADMIN',
  '22222222-2222-2222-2222-222222222201'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000022'::uuid,
  'jaja29193@gmail.com',
  'Imajica123',
  'Jonila Marie E. Barro',
  'BRANCH_ADMIN',
  '22222222-2222-2222-2222-222222222206'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000023'::uuid,
  'sweetkatrina143@yahoo.com',
  'Imajica123',
  'Katrina',
  'HQ_ADMIN',
  '00000000-0000-0000-0000-000000000001'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000024'::uuid,
  'frances@moobdigital.com',
  'Imajica123',
  'Marketing Frances',
  'HQ_ADMIN',
  '00000000-0000-0000-0000-000000000001'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000025'::uuid,
  'support@moobdigital.com',
  'Imajica123',
  'Marketing Support',
  'HQ_ADMIN',
  '00000000-0000-0000-0000-000000000001'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000026'::uuid,
  'mearose@gmail.com',
  'Imajica123',
  'Mea Rose Salvador',
  'BRANCH_ADMIN',
  '22222222-2222-2222-2222-222222222206'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000027'::uuid,
  'melissagervacio041@gmail.com',
  'Imajica123',
  'Mellisa Gervacio',
  'BRANCH_ADMIN',
  '22222222-2222-2222-2222-222222222202'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000028'::uuid,
  'esmaeldaisy12@gmail.com',
  'Imajica123',
  'Noraisa Unayan',
  'BRANCH_ADMIN',
  '22222222-2222-2222-2222-222222222201'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000029'::uuid,
  'gomezreamie13@gmail.com',
  'Imajica123',
  'Rei Rei',
  'BRANCH_ADMIN',
  '22222222-2222-2222-2222-222222222206'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000030'::uuid,
  'rhasmonteclaro01@gmail.com',
  'Imajica123',
  'Rhas Monteclaro',
  'BRANCH_ADMIN',
  '22222222-2222-2222-2222-222222222201'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000031'::uuid,
  'rizielle112388@gmail.com',
  'Imajica123',
  'Rizielle M. De Dios',
  'BRANCH_ADMIN',
  '22222222-2222-2222-2222-222222222205'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000032'::uuid,
  'jangmi2575@gmail.com',
  'Imajica123',
  'Rosalie Manalo',
  'BRANCH_ADMIN',
  '22222222-2222-2222-2222-222222222203'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000033'::uuid,
  'samerahsandigan01@gmail.com',
  'Imajica123',
  'Samerah Sandigan',
  'BRANCH_ADMIN',
  '22222222-2222-2222-2222-222222222201'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000034'::uuid,
  '547vador.shiene@gmail.com',
  'Imajica123',
  'Shiene S. Lucero',
  'BRANCH_ADMIN',
  '22222222-2222-2222-2222-222222222206'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000035'::uuid,
  'imajicagmsittie@gmail.com',
  'Imajica123',
  'Sittie Hannah kasim',
  'BRANCH_ADMIN',
  '22222222-2222-2222-2222-222222222201'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000036'::uuid,
  'shine.feliciano@gmail.com',
  'Imajica123',
  'Sunshine Manalo Feliciano',
  'BRANCH_ADMIN',
  '22222222-2222-2222-2222-222222222206'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000037'::uuid,
  'tablefr01@gmail.com',
  'Imajica123',
  'tablemanager001',
  'BRANCH_ADMIN',
  '22222222-2222-2222-2222-222222222205'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000038'::uuid,
  'tablefr02@gmail.com',
  'Imajica123',
  'tablemanager002',
  'BRANCH_ADMIN',
  '22222222-2222-2222-2222-222222222206'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000039'::uuid,
  'tablebr01@gmail.com',
  'Imajica123',
  'tablemanager01',
  'BRANCH_ADMIN',
  '22222222-2222-2222-2222-222222222201'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000040'::uuid,
  'tablebr02@gmail.com',
  'Imajica123',
  'tablemanager02',
  'BRANCH_ADMIN',
  '22222222-2222-2222-2222-222222222202'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000041'::uuid,
  'tablebr03@gmail.com',
  'Imajica123',
  'tablemanager03',
  'BRANCH_ADMIN',
  '22222222-2222-2222-2222-222222222203'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000042'::uuid,
  'veronnemay@gmail.com',
  'Imajica123',
  'Veronica Mayo',
  'BRANCH_ADMIN',
  '22222222-2222-2222-2222-222222222202'::uuid
);
select public._seed_team_auth_user(
  '33333333-3333-3333-3333-000000000043'::uuid,
  'zhairethchua81@gmail.com',
  'Imajica123',
  'Zhai',
  'HQ_ADMIN',
  '00000000-0000-0000-0000-000000000001'::uuid
);

drop function if exists public._seed_team_auth_user(uuid, text, text, text, text, uuid);
