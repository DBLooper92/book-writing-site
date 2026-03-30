alter table public.attachments
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists file_size_bytes bigint;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'entity-images',
  'entity-images',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "entity_images_select_own" on storage.objects;
create policy "entity_images_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'entity-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "entity_images_insert_own" on storage.objects;
create policy "entity_images_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'entity-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "entity_images_update_own" on storage.objects;
create policy "entity_images_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'entity-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'entity-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "entity_images_delete_own" on storage.objects;
create policy "entity_images_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'entity-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
