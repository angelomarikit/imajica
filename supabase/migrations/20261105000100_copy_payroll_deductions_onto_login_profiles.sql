-- HR saved SSS / Pag-IBIG / PhilHealth on personal-email payroll rows.
-- Salary and Deductions read the clinic login profile, which was still zero.
-- Copy those amounts onto the login row without wiping a newer non-zero value
-- (for example a 2nd-cut other deduction already entered on the login profile).

update public.payroll_employee_profiles dst
set
  sss_employee = greatest(dst.sss_employee, src.sss_employee),
  mpf_employee = greatest(dst.mpf_employee, src.mpf_employee),
  pagibig_employee = greatest(dst.pagibig_employee, src.pagibig_employee),
  philhealth_employee = greatest(dst.philhealth_employee, src.philhealth_employee),
  sss_employer = greatest(dst.sss_employer, src.sss_employer),
  mpf_employer = greatest(dst.mpf_employer, src.mpf_employer),
  ec_employer = greatest(dst.ec_employer, src.ec_employer),
  pagibig_employer = greatest(dst.pagibig_employer, src.pagibig_employer),
  philhealth_employer = greatest(dst.philhealth_employer, src.philhealth_employer),
  other_deduction = greatest(dst.other_deduction, src.other_deduction),
  allowance = greatest(dst.allowance, src.allowance),
  tin = case when coalesce(dst.tin, '') = '' then src.tin else dst.tin end,
  sss_no = case when coalesce(dst.sss_no, '') = '' then src.sss_no else dst.sss_no end,
  pagibig_no = case when coalesce(dst.pagibig_no, '') = '' then src.pagibig_no else dst.pagibig_no end,
  philhealth_no = case when coalesce(dst.philhealth_no, '') = '' then src.philhealth_no else dst.philhealth_no end,
  updated_at = now()
from public.payroll_employee_profiles src
where (dst.email, src.email) in (
  ('samerah.sandigan@imajica.com', 'imajicasamerah@gmail.com'),
  ('janice.aguirre@imajica.com', 'janiceaguirre014@gmail.com'),
  ('noraisa.unayan@imajica.com', 'esmaeldaisy12@gmail.com'),
  ('sitti.nur.aisa.tan@imajica.com', 'sittinuraisat@gmail.com'),
  ('ynyr.collene.bandoquillo@imajica.com', 'ynyrnicollebandoquillo@gmail.com')
);
