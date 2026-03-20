# Religions

## Status

Implemented now.

## What Exists

- `types/religion.ts`
- `lib/firebase/religions.ts`
- `hooks/use-religions.ts`
- `hooks/use-religion.ts`
- `components/religions/religion-form.tsx`
- `components/religions/religion-card.tsx`
- `components/religions/religion-detail-section.tsx`
- `app/religions/page.tsx`
- `app/religions/new/page.tsx`
- `app/religions/[religionId]/page.tsx`
- `app/religions/[religionId]/edit/page.tsx`

## Important Rules

- religion documents must live under `users/{uid}/projects/{projectId}/religions/{religionId}`
- the slice follows the same list/create/detail/edit pattern used by the existing canon slices
- the initial form stays intentionally smaller than the canonical religion shape
- seeded religion documents and user-created religion documents normalize into the same UI-ready type
- readable IDs are generated from the religion name with collision handling

## Current Role In The Architecture

Religions turns existing `religionIds` references in Characters, Cultures, Factions, Timeline Events, and the starter dataset into a real implemented slice instead of a seed-only placeholder.

## What Remains Later

- delete flow
- linked navigation from characters, cultures, factions, and timeline events into religion detail pages
- real entity pickers instead of raw ID entry
- stronger validation across cross-entity religion references
