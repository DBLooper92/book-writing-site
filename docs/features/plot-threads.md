# Plot Threads

## Status

Implemented now.

## What Exists

- `types/plot-thread.ts`
- `lib/data/plot-threads.ts`
- `hooks/use-plot-threads.ts`
- `hooks/use-plot-thread.ts`
- `components/plot-threads/plot-thread-form.tsx`
- `components/plot-threads/plot-thread-card.tsx`
- `components/plot-threads/plot-thread-detail-section.tsx`
- `app/plot-threads/page.tsx`
- `app/plot-threads/new/page.tsx`
- `app/plot-threads/[plotThreadId]/page.tsx`
- `app/plot-threads/[plotThreadId]/edit/page.tsx`

## Important Rules

- plot-thread rows must stay scoped by `user_id`, `project_id`, and readable `id`
- Supabase rows preserve the same project-scoped record shape through `user_id`, `project_id`, and readable `id`
- the slice follows the same list/create/detail/edit pattern used by the existing canon slices
- the initial form stays intentionally smaller than the canonical plot-thread shape
- database rows and seeded records normalize into the same UI-ready type
- readable IDs are generated from the plot-thread title with collision handling

## Current Role In The Architecture

Plot Threads turns existing thread references in Books, Chapters, Scenes, Timeline Events, Themes, Notes, and the starter dataset into a real implemented slice instead of a seed-only placeholder. The active runtime now uses a simple Supabase fetch/refetch path for list, detail, create, and edit behavior.

## What Remains Later

- delete flow
- linked navigation from books, chapters, scenes, timeline events, themes, and notes into plot-thread detail pages
- real entity pickers instead of raw ID entry
- stronger validation across cross-entity plot-thread references


