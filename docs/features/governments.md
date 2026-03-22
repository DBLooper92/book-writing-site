# Governments

## Status

Implemented now.

## What Exists

- `types/government.ts`
- `lib/data/governments.ts`
- `hooks/use-governments.ts`
- `hooks/use-government.ts`
- `components/governments/government-form.tsx`
- `components/governments/government-card.tsx`
- `components/governments/government-detail-section.tsx`
- `app/governments/page.tsx`
- `app/governments/new/page.tsx`
- `app/governments/[governmentId]/page.tsx`
- `app/governments/[governmentId]/edit/page.tsx`

## Important Rules

- government rows must stay scoped by `user_id`, `project_id`, and readable `id`
- Supabase rows preserve the same project-scoped record shape through `user_id`, `project_id`, and readable `id`
- the slice follows the same list/create/detail/edit pattern used by the existing canon slices
- the initial form stays intentionally smaller than the canonical government shape
- database rows and seeded records normalize into the same UI-ready type
- readable IDs are generated from the government name with collision handling

## Current Role In The Architecture

Governments turns existing `governmentId` references in Factions and the starter dataset into a real implemented slice instead of a seed-only placeholder. The active runtime now uses a simple Supabase fetch/refetch path for list, detail, create, and edit behavior.

## What Remains Later

- delete flow
- linked navigation from factions and future organization records into government detail pages
- real entity pickers instead of raw ID entry
- stronger validation across cross-entity government references


