# Chapters

## Status

Implemented now as the fifth full entity slice and the second manuscript-structure slice.

## What Exists

- `types/chapter.ts`
- `lib/firebase/chapters.ts`
- `lib/data/chapters.ts`
- `hooks/use-chapters.ts`
- `hooks/use-chapter.ts`
- `components/chapters/chapter-form.tsx`
- `components/chapters/chapter-card.tsx`
- `components/chapters/chapter-detail-section.tsx`
- `app/chapters/page.tsx`
- `app/chapters/new/page.tsx`
- `app/chapters/[chapterId]/page.tsx`
- `app/chapters/[chapterId]/edit/page.tsx`

## Important Rules

- chapter documents must stay project-scoped and map cleanly to `chapters` rows keyed by `user_id`, `project_id`, and `id` during the Supabase migration
- the slice follows the same list/create/detail/edit pattern as Books, Characters, Locations, and Notes
- the first-pass form stays intentionally focused on title, book link, chapter number, purpose, and POV metadata
- normalized records are used consistently in the UI
- readable IDs are generated from the title with collision handling

## Current Role In The Architecture

Chapters is the first child manuscript slice. It keeps manuscript structure project-scoped and flat at the collection level while linking back to `bookId`, and Scenes now builds directly on that structure without changing the established slice architecture.

The active Chapters runtime now uses the same Supabase-backed fetch/refetch pattern as Books, Characters, and Locations. The old `lib/firebase/*` import path remains only as a compatibility shim.

## What Remains Later

- delete flow
- richer book, scene, character, and timeline-event linking
- linked navigation to referenced records
- search, filtering, and sorting controls beyond the current default ordering
- richer manuscript progress views across books and chapters

