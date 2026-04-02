alter table if exists public.ai_sessions
  add column if not exists workflow_state jsonb;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-documents',
  'project-documents',
  false,
  26214400,
  array[
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "project_documents_select_own" on storage.objects;
create policy "project_documents_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'project-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "project_documents_insert_own" on storage.objects;
create policy "project_documents_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'project-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "project_documents_update_own" on storage.objects;
create policy "project_documents_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'project-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'project-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "project_documents_delete_own" on storage.objects;
create policy "project_documents_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'project-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);
