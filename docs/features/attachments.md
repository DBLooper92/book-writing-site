# Attachments

## Status

Implemented now as the latest full entity slice and the shared image-upload backing layer for other slices.

## What Exists

- `types/attachment.ts`
- `lib/data/attachments.ts`
- `hooks/use-attachments.ts`
- `hooks/use-attachment.ts`
- `components/attachments/attachment-form.tsx`
- `components/attachments/attachment-card.tsx`
- `components/attachments/attachment-detail-section.tsx`
- `components/attachments/attachment-image-preview.tsx`
- `components/attachments/entity-image-gallery.tsx`
- `app/attachments/page.tsx`
- `app/attachments/new/page.tsx`
- `app/attachments/[attachmentId]/page.tsx`
- `app/attachments/[attachmentId]/edit/page.tsx`
- `supabase/migrations/202603300001_attachment_image_storage.sql`

## Important Rules

- attachment rows must stay scoped by `user_id`, `project_id`, and readable `id`
- Supabase rows keep the same scoped shape through `user_id`, `project_id`, and the readable `id`
- the slice follows the same list/create/detail/edit pattern as the existing entity slices
- uploaded images live in the private `entity-images` Supabase Storage bucket and keep their scoped metadata on the linked `attachments` row
- the manual attachment form stays intentionally focused on metadata and linked record IDs, while linked entity detail pages own the shared image upload/delete UI
- normalized records are used consistently in the UI
- readable IDs are generated from the title with collision handling

## Current Role In The Architecture

Attachments turns seeded reference-file metadata into a real project-scoped slice and now also backs linked image uploads across the main entity detail pages. The active runtime uses Supabase fetch/refetch reads and writes through `lib/data/attachments.ts`, stores uploaded image files in a private bucket, and renders preview/delete controls through the shared image-gallery component.

## What Remains Later

- dedicated standalone delete flow from the attachments slice list/detail pages
- broader non-image file upload and storage workflow beyond the current linked image flow
- richer entity pickers and linked navigation to referenced records
- validation that linked IDs point at real project records


