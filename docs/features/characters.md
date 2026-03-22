# Characters

## Status

Implemented now. Characters is the reference entity slice for the repo.

## What Exists

- `types/character.ts`
- `lib/firebase/characters.ts`
- `lib/data/characters.ts`
- `hooks/use-characters.ts`
- `hooks/use-character.ts`
- `components/characters/character-form.tsx`
- `components/characters/character-card.tsx`
- `components/characters/character-detail-section.tsx`
- `app/characters/page.tsx`
- `app/characters/new/page.tsx`
- `app/characters/[characterId]/page.tsx`
- `app/characters/[characterId]/edit/page.tsx`

## Important Rules

- character documents must stay project-scoped and map cleanly to `characters` rows keyed by `user_id`, `project_id`, and `id` during the Supabase migration
- the current UI depends on the active project
- the form is intentionally smaller than the full canonical character type
- normalized records are used consistently in the UI
- readable IDs are generated from the name with collision handling

## Why It Matters

Future entity slices should imitate this implementation pattern first, then extend it where necessary. Characters is still the baseline for:

- file layout
- create/update flow
- normalization behavior
- page-state handling
- reusable form-driven CRUD structure

The active Characters runtime now uses the same Supabase-backed fetch/refetch pattern as Books. The old `lib/firebase/*` import path remains only as a compatibility shim.

## What Remains Later

- delete flow
- richer relationship pickers
- linked navigation to other entity detail pages
- filtering, sorting, and search
- validation across cross-entity references

