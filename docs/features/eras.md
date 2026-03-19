# Eras

## Status

Implemented now.

## What Exists

- `types/era.ts`
- `lib/firebase/eras.ts`
- `hooks/use-eras.ts`
- `hooks/use-era.ts`
- `components/eras/era-form.tsx`
- `components/eras/era-card.tsx`
- `components/eras/era-detail-section.tsx`
- `app/eras/page.tsx`
- `app/eras/new/page.tsx`
- `app/eras/[eraId]/page.tsx`
- `app/eras/[eraId]/edit/page.tsx`

## Important Rules

- era documents must live under `users/{uid}/projects/{projectId}/eras/{eraId}`
- the slice follows the same list/create/detail/edit pattern used by the existing worldbuilding and chronology slices
- the initial form stays intentionally smaller than the canonical era shape
- seeded era documents and user-created era documents normalize into the same UI-ready type
- readable IDs are generated from the era name with collision handling

## Current Role In The Architecture

Eras turns existing `eraId` and `eraIds` references in Timeline Events, Locations, Cultures, and the starter dataset into a real implemented slice instead of a seed-only placeholder. It adds historical anchors without changing the project-scoped Firestore model.

## What Remains Later

- delete flow
- linked navigation from locations, cultures, and timeline events into era detail pages
- real entity pickers instead of raw ID entry
- stronger validation across cross-entity era references
