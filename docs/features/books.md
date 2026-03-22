# Books

## Status

Implemented now as the fourth full entity slice and the first manuscript-structure slice.

## What Exists

- `types/book.ts`
- `lib/data/books.ts`
- `hooks/use-books.ts`
- `hooks/use-book.ts`
- `components/books/book-form.tsx`
- `components/books/book-card.tsx`
- `components/books/book-detail-section.tsx`
- `app/books/page.tsx`
- `app/books/new/page.tsx`
- `app/books/[bookId]/page.tsx`
- `app/books/[bookId]/edit/page.tsx`

## Important Rules

- book rows must stay scoped by `user_id`, `project_id`, and readable `id`
- the slice follows the same list/create/detail/edit pattern as Characters, Locations, and Notes
- the first-pass form stays intentionally focused on title, summary, premise, chronology years, and draft metadata
- normalized records are used consistently in the UI
- readable IDs are generated from the title with collision handling

## Current Role In The Architecture

Books is the first real manuscript-structure slice. It gives the repo a concrete parent entity for real chapter and scene work plus later chronology work without introducing a different architecture from the canon-oriented slices.

The active Books runtime now uses the same Supabase-backed fetch/refetch path as the rest of the implemented slices.

## What Remains Later

- delete flow
- richer links to chapters, scenes, characters, and timeline events
- manuscript progress views beyond the current detail page
- linked navigation to referenced records


