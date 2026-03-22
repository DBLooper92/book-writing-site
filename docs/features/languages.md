# Languages

## Status

Implemented now.

## What Exists

- `types/language.ts`
- `lib/data/languages.ts`
- `lib/firebase/languages.ts`
- `hooks/use-languages.ts`
- `hooks/use-language.ts`
- `components/languages/language-form.tsx`
- `components/languages/language-card.tsx`
- `components/languages/language-detail-section.tsx`
- `app/languages/page.tsx`
- `app/languages/new/page.tsx`
- `app/languages/[languageId]/page.tsx`
- `app/languages/[languageId]/edit/page.tsx`

## Important Rules

- language documents must live under `users/{uid}/projects/{projectId}/languages/{languageId}`
- Supabase rows now map closely to the existing Firestore shape using `user_id`, `project_id`, and `id`
- the slice follows the same list/create/detail/edit pattern used by the existing canon slices
- the initial form stays intentionally smaller than the canonical language shape
- database rows and seeded records normalize into the same UI-ready type
- readable IDs are generated from the language name with collision handling

## Current Role In The Architecture

Languages turns existing `languageIds` and `defaultLanguageId` references in Characters, Cultures, project settings, and the starter dataset into a real implemented slice instead of a seed-only placeholder. The active runtime now uses a simple Supabase fetch/refetch path for list, detail, create, and edit behavior. The old `lib/firebase/*` import path remains only as a compatibility shim.

## What Remains Later

- delete flow
- linked navigation from characters, cultures, and project settings into language detail pages
- real entity pickers instead of raw ID entry
- stronger validation across cross-entity language references

