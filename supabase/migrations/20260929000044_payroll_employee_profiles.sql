-- Payroll employee profiles (rates + statutory shares from Imajica payroll spreadsheet).
-- Attendance Time In / Time Out drives days present, late, and undertime deductions in the app.

create table if not exists public.payroll_employee_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  first_name text not null,
  middle_name text,
  last_name text not null,
  email text not null unique,
  branch_id uuid references public.branches (id) on delete set null,
  branch_label text,
  job_title text,
  employment_status text,
  shift_label text not null default 'TUE - SUN 9:45 AM - 7:00 PM',
  salary_per_day numeric(12,2) not null,
  tin text,
  pagibig_no text,
  philhealth_no text,
  sss_no text,
  sss_employee numeric(12,2) not null default 0,
  mpf_employee numeric(12,2) not null default 0,
  pagibig_employee numeric(12,2) not null default 0,
  philhealth_employee numeric(12,2) not null default 0,
  sss_employer numeric(12,2) not null default 0,
  mpf_employer numeric(12,2) not null default 0,
  ec_employer numeric(12,2) not null default 0,
  pagibig_employer numeric(12,2) not null default 0,
  philhealth_employer numeric(12,2) not null default 0,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payroll_employee_profiles_branch_idx
  on public.payroll_employee_profiles (branch_id);

comment on table public.payroll_employee_profiles is
  'Staff payroll master: daily rate + SSS/Pag-IBIG/PhilHealth shares; MBS = salary_per_day * 26';

alter table public.payroll_employee_profiles enable row level security;

drop policy if exists payroll_employee_profiles_hq_select on public.payroll_employee_profiles;
create policy payroll_employee_profiles_hq_select
  on public.payroll_employee_profiles
  for select
  to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role_id in ('SUPER_ADMIN', 'HQ_ADMIN')
    )
  );

drop policy if exists payroll_employee_profiles_hq_write on public.payroll_employee_profiles;
create policy payroll_employee_profiles_hq_write
  on public.payroll_employee_profiles
  for all
  to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role_id in ('SUPER_ADMIN', 'HQ_ADMIN')
    )
  )
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role_id in ('SUPER_ADMIN', 'HQ_ADMIN')
    )
  );

-- Seed the five spreadsheet employees (idempotent on email)
insert into public.payroll_employee_profiles (
  first_name, middle_name, last_name, email, branch_id, branch_label, job_title,
  employment_status, salary_per_day, tin, pagibig_no, philhealth_no, sss_no,
  sss_employee, mpf_employee, pagibig_employee, philhealth_employee,
  sss_employer, mpf_employer, ec_employer, pagibig_employer, philhealth_employer
) values
  (
    'Samerah', 'Mislay', 'Sandigan', 'imajicasamerah@gmail.com', null, 'All Branch',
    'General Manager', 'Regular', 900,
    '623-632-244-00000', '121316879754', '03-026876571-5', '35-2475186-1',
    1000, 50, 200, 585, 2000, 100, 30, 200, 585
  ),
  (
    'Ynyr Collene', 'Sioting', 'Bandoquillo', 'ynyrnicollebandoquillo@gmail.com',
    '22222222-2222-2222-2222-222222222201', 'San Mateo',
    'Branch Manager', 'Probationary', 800,
    '668087122', '121360118270', '03-027200204-1', '35-2310463-9',
    900, 0, 200, 520, 1800, 0, 30, 200, 520
  ),
  (
    'Noraisa', 'Unayan', 'Esmael', 'esmaeldaisy12@gmail.com',
    '22222222-2222-2222-2222-222222222201', 'San Mateo',
    'Aesthetician', 'Regular', 750,
    '675-805-623-00000', '121365328541', '03-027174868-6', '09-5365930-4',
    775, 0, 200, 487.50, 1550, 0, 30, 200, 487.50
  ),
  (
    'Janice', 'Bagadiong', 'Aguirre', 'janiceaguirre014@gmail.com',
    '22222222-2222-2222-2222-222222222201', 'San Mateo',
    'IVT / Aesthetician', 'Regular', 790,
    '722-061-017-000', '121191728495', '102011419892', '33-9316099-7',
    900, 0, 200, 513.50, 1800, 0, 30, 200, 513.50
  ),
  (
    'Sitti Nur Aisa', 'Hajijol', 'Tan', 'sittinuraisat@gmail.com',
    '22222222-2222-2222-2222-222222222201', 'San Mateo',
    'Aesthetician', 'Regular', 750,
    '675-836-254-00000', '121365331263', '20-250354187-6', '35-3861175-1',
    775, 0, 200, 487.50, 1550, 0, 30, 200, 487.50
  )
on conflict (email) do update set
  first_name = excluded.first_name,
  middle_name = excluded.middle_name,
  last_name = excluded.last_name,
  branch_id = excluded.branch_id,
  branch_label = excluded.branch_label,
  job_title = excluded.job_title,
  employment_status = excluded.employment_status,
  salary_per_day = excluded.salary_per_day,
  sss_employee = excluded.sss_employee,
  mpf_employee = excluded.mpf_employee,
  pagibig_employee = excluded.pagibig_employee,
  philhealth_employee = excluded.philhealth_employee,
  sss_employer = excluded.sss_employer,
  mpf_employer = excluded.mpf_employer,
  ec_employer = excluded.ec_employer,
  pagibig_employer = excluded.pagibig_employer,
  philhealth_employer = excluded.philhealth_employer,
  updated_at = now();
