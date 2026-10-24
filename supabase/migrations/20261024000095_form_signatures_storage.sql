-- Private storage for Imajica Forms signatures (keep jsonb free of large base64).
-- Paths: {form_id}/client.jpg | {form_id}/other.jpg

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'form-signatures',
  'form-signatures',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists form_signatures_select on storage.objects;
create policy form_signatures_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'form-signatures'
    and (
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
  );

drop policy if exists form_signatures_insert on storage.objects;
create policy form_signatures_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'form-signatures'
    and (
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
  );

drop policy if exists form_signatures_update on storage.objects;
create policy form_signatures_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'form-signatures'
    and (
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
  )
  with check (
    bucket_id = 'form-signatures'
    and (
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
  );

drop policy if exists form_signatures_delete on storage.objects;
create policy form_signatures_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'form-signatures'
    and (
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
  );

comment on column public.imajica_forms.client_signature_path is
  'Storage path in form-signatures bucket (not base64 in jsonb)';
comment on column public.imajica_forms.other_signature_path is
  'Storage path in form-signatures bucket for secondary signature';
