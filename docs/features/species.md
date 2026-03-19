# Species

## Status

Implemented now.

## What Exists

- `types/species.ts`
- `lib/firebase/species.ts`
- `hooks/use-species.ts`
- `hooks/use-species-record.ts`
- `components/species/species-form.tsx`
- `components/species/species-card.tsx`
- `components/species/species-detail-section.tsx`
- `app/species/page.tsx`
- `app/species/new/page.tsx`
- `app/species/[speciesId]/page.tsx`
- `app/species/[speciesId]/edit/page.tsx`

## Important Rules

- species documents must live under `users/{uid}/projects/{projectId}/species/{speciesId}`
- the slice follows the same list/create/detail/edit pattern used by Characters, Factions, Cultures, and Locations
- the hook filenames use `use-species.ts` and `use-species-record.ts` because singular and plural naming would otherwise collide
- the initial form is still intentionally smaller than the full long-term species schema
- seeded species documents and user-created species documents normalize into the same UI-ready type

## Current Role In The Architecture

Species makes existing `speciesId` references in Characters point toward a real implemented slice instead of seed-only documents.

## What Remains Later

- delete flow
- linked navigation from related character records into species detail pages
- stronger validation around `speciesId` references in character editing flows
- richer cross-entity pickers once more worldbuilding slices are real
