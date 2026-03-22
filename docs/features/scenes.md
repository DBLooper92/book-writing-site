# Scenes

## Status

Implemented now as the sixth full entity slice and the third manuscript-structure slice.

## What Exists

- `types/scene.ts`
- `lib/firebase/scenes.ts`
- `lib/data/scenes.ts`
- `hooks/use-scenes.ts`
- `hooks/use-scene.ts`
- `components/scenes/scene-form.tsx`
- `components/scenes/scene-card.tsx`
- `components/scenes/scene-detail-section.tsx`
- `app/scenes/page.tsx`
- `app/scenes/new/page.tsx`
- `app/scenes/[sceneId]/page.tsx`
- `app/scenes/[sceneId]/edit/page.tsx`

## Important Rules

- scene documents must stay project-scoped and map cleanly to `scenes` rows keyed by `user_id`, `project_id`, and `id` during the Supabase migration
- the slice follows the same list/create/detail/edit pattern as Books, Chapters, Characters, Locations, and Notes
- the first-pass form stays intentionally focused on title, manuscript links, scene beats, and draft text
- normalized records are used consistently in the UI
- readable IDs are generated from the title with collision handling

## Current Role In The Architecture

Scenes turns the manuscript structure into actionable narrative units while staying inside the same flat per-project slice architecture as the rest of the repo. It gives later timeline-event work real scene records to reference instead of relying on seed data alone.

The active Scenes runtime now uses the same Supabase-backed fetch/refetch pattern as Books, Chapters, Characters, and Locations. The old `lib/firebase/*` import path remains only as a compatibility shim.

## What Remains Later

- delete flow
- richer book, chapter, character, and timeline-event linking
- linked navigation to referenced records
- search, filtering, and sorting controls beyond the current default ordering
- richer drafting and revision tooling built on top of the current scene document

