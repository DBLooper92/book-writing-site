# Attachments

## Status

Implemented now as the latest full entity slice.

## What Exists

- `types/attachment.ts`
- `lib/firebase/attachments.ts`
- `lib/data/attachments.ts`
- `hooks/use-attachments.ts`
- `hooks/use-attachment.ts`
- `components/attachments/attachment-form.tsx`
- `components/attachments/attachment-card.tsx`
- `components/attachments/attachment-detail-section.tsx`
- `app/attachments/page.tsx`
- `app/attachments/new/page.tsx`
- `app/attachments/[attachmentId]/page.tsx`
- `app/attachments/[attachmentId]/edit/page.tsx`

## Important Rules

- attachment documents must live under `users/{uid}/projects/{projectId}/attachments/{attachmentId}`
- Supabase rows keep the same scoped shape through `user_id`, `project_id`, and the readable `id`
- the slice follows the same list/create/detail/edit pattern as the existing entity slices
- the first-pass form stays intentionally focused on file metadata and raw linked record IDs, not actual upload workflow
- normalized records are used consistently in the UI
- readable IDs are generated from the title with collision handling

## Current Role In The Architecture

Attachments turns seeded reference-file metadata into a real project-scoped slice without pretending that upload storage already exists. The active runtime now uses Supabase fetch/refetch reads and writes through `lib/data/attachments.ts`. The old `lib/firebase/*` import path remains only as a compatibility shim.

## What Remains Later

- delete flow
- real file upload and storage integration
- richer entity pickers and linked navigation to referenced records
- validation that linked IDs point at real project records

