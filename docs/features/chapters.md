# Chapters

## Status

Implemented now as the fifth full entity slice and the second manuscript-structure slice.

## What Exists

- `types/chapter.ts`
- `lib/firebase/chapters.ts`
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

- chapter documents must live under `users/{uid}/projects/{projectId}/chapters/{chapterId}`
- the slice follows the same list/create/detail/edit pattern as Books, Characters, Locations, and Notes
- the first-pass form stays intentionally focused on title, book link, chapter number, purpose, and POV metadata
- Firestore docs are normalized before use in the UI
- readable IDs are generated from the title with collision handling

## Current Role In The Architecture

Chapters is the first child manuscript slice. It keeps manuscript structure project-scoped and flat at the collection level while linking back to `bookId`, and Scenes now builds directly on that structure without changing the established slice architecture.

## What Remains Later

- delete flow
- richer book, scene, character, and timeline-event linking
- linked navigation to referenced records
- search, filtering, and sorting controls beyond the current default ordering
- richer manuscript progress views across books and chapters
