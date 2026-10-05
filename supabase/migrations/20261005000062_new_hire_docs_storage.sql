-- Private storage for New Hire onboarding documents
-- Path: {new_hire_id}/{requirement_id}/{filename}

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'new-hire-docs',
  'new-hire-docs',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'image/heic',
    'image/heif'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists new_hire_docs_select on storage.objects;
create policy new_hire_docs_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'new-hire-docs'
    and (
      public.is_people_ops()
      or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN'])
    )
  );

drop policy if exists new_hire_docs_insert on storage.objects;
create policy new_hire_docs_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'new-hire-docs'
    and (
      public.is_people_ops()
      or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN'])
    )
  );

drop policy if exists new_hire_docs_update on storage.objects;
create policy new_hire_docs_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'new-hire-docs'
    and (
      public.is_people_ops()
      or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN'])
    )
  )
  with check (
    bucket_id = 'new-hire-docs'
    and (
      public.is_people_ops()
      or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN'])
    )
  );

drop policy if exists new_hire_docs_delete on storage.objects;
create policy new_hire_docs_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'new-hire-docs'
    and (
      public.is_people_ops()
      or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN'])
    )
  );
