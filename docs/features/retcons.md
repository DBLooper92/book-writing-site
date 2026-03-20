# Retcons

## Status

Implemented now as the latest full entity slice.

## What Exists

- `types/retcon.ts`
- `lib/firebase/retcons.ts`
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

- retcon documents must live under `users/{uid}/projects/{projectId}/retcons/{retconId}`
- the slice follows the same list/create/detail/edit pattern as the existing entity slices
- the first-pass form stays intentionally focused on old canon, new canon, reason, and raw affected record IDs
- Firestore docs are normalized before use in the UI
- readable IDs are generated from the title with collision handling

## Current Role In The Architecture

Retcons turns canon-change tracking into a real project-scoped slice without inventing a new workflow architecture. It makes the seeded retcon document navigable and editable while preserving the repo rule that downstream entity impact stays explicit in Firestore instead of in AI chat state.

## What Remains Later

- delete flow
- richer entity pickers and linked navigation to affected records
- validation that affected IDs and collection types match real project documents
- richer resolution workflow beyond the current first-pass status and resolved fields
