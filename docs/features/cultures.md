# Cultures

## Status

Implemented now.

## What Exists

- `types/culture.ts`
- `lib/firebase/cultures.ts`
- `hooks/use-cultures.ts`
- `hooks/use-culture.ts`
- `components/cultures/culture-form.tsx`
- `components/cultures/culture-card.tsx`
- `components/cultures/culture-detail-section.tsx`
- `app/cultures/page.tsx`
- `app/cultures/new/page.tsx`
- `app/cultures/[cultureId]/page.tsx`
- `app/cultures/[cultureId]/edit/page.tsx`

## Important Rules

- culture documents must live under `users/{uid}/projects/{projectId}/cultures/{cultureId}`
- the slice follows the same list/create/detail/edit pattern used by Characters, Factions, and Locations
- the initial form is intentionally smaller than the canonical culture shape
- seeded culture documents and user-created culture documents normalize into the same UI-ready type
- related IDs stay as strings or string arrays for future linked navigation work

## Current Role In The Architecture

Cultures makes existing `cultureIds` references in Characters, Factions, Locations, and Timeline Events point toward a real implemented slice instead of seed-only documents.

## What Remains Later

- delete flow
- linked navigation from related records into culture detail pages
- relationship pickers for languages, religions, factions, and eras
- stronger validation across referenced entity IDs
