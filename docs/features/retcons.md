# Retcons

## Status

Implemented now as the latest full entity slice.

## What Exists

- `types/retcon.ts`
- `lib/data/retcons.ts`
- `hooks/use-retcons.ts`
- `hooks/use-retcon.ts`
- `components/retcons/retcon-form.tsx`
- `components/retcons/retcon-card.tsx`
- `components/retcons/retcon-detail-section.tsx`
- `app/retcons/page.tsx`
- `app/retcons/new/page.tsx`
- `app/retcons/[retconId]/page.tsx`
- `app/retcons/[retconId]/edit/page.tsx`

## Important Rules

- retcon rows must stay scoped by `user_id`, `project_id`, and readable `id`
- Supabase rows keep the same scoped shape through `user_id`, `project_id`, and the readable `id`
- the slice follows the same list/create/detail/edit pattern as the existing entity slices
- the first-pass form stays intentionally focused on old canon, new canon, reason, and raw affected record IDs
- normalized records are used consistently in the UI
- readable IDs are generated from the title with collision handling

## Current Role In The Architecture

Retcons turns canon-change tracking into a real project-scoped slice without inventing a new workflow architecture. The active runtime now uses Supabase fetch/refetch reads and writes through `lib/data/retcons.ts`.

## What Remains Later

- delete flow
- richer entity pickers and linked navigation to affected records
- validation that affected IDs and collection types match real project documents
- richer resolution workflow beyond the current first-pass status and resolved fields


