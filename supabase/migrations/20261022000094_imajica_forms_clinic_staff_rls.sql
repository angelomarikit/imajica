-- Allow clinic staff who fill Imajica Forms to read/write form history (not only HQ / CM / receptionist).
-- Signatures + field_values stay in jsonb; no new columns required.

drop policy if exists imajica_forms_staff on public.imajica_forms;
create policy imajica_forms_staff on public.imajica_forms
  for all to authenticated
  using (
    public.is_hq()
    or public.is_people_ops()
    or public.is_operations_manager()
    or public.has_role(
      array[
        'BRANCH_ADMIN',
        'BRANCH_MARKETING',
        'RECEPTIONIST',
        'STAFF',
        'DOCTOR',
        'NURSE',
        'AESTHETICIAN',
        'SUPER_ADMIN',
        'HQ_ADMIN'
      ]
    )
  )
  with check (
    public.is_hq()
    or public.is_people_ops()
    or public.is_operations_manager()
    or public.has_role(
      array[
        'BRANCH_ADMIN',
        'BRANCH_MARKETING',
        'RECEPTIONIST',
        'STAFF',
        'DOCTOR',
        'NURSE',
        'AESTHETICIAN',
        'SUPER_ADMIN',
        'HQ_ADMIN'
      ]
    )
  );

comment on policy imajica_forms_staff on public.imajica_forms is
  'Clinic + HQ roles may save / view generated consent forms (avoids localStorage-only history).';
