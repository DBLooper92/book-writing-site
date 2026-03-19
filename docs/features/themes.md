# Themes

## Status

Implemented now.

## What Exists

- `types/theme.ts`
- `lib/firebase/themes.ts`
- `hooks/use-themes.ts`
- `hooks/use-theme.ts`
- `components/themes/theme-form.tsx`
- `components/themes/theme-card.tsx`
- `components/themes/theme-detail-section.tsx`
- `app/themes/page.tsx`
- `app/themes/new/page.tsx`
- `app/themes/[themeId]/page.tsx`
- `app/themes/[themeId]/edit/page.tsx`

## Important Rules

- theme documents must live under `users/{uid}/projects/{projectId}/themes/{themeId}`
- the slice follows the same list/create/detail/edit pattern used by the existing canon slices
- the initial form stays intentionally smaller than the canonical theme shape
- seeded theme documents and user-created theme documents normalize into the same UI-ready type
- readable IDs are generated from the theme name with collision handling

## Current Role In The Architecture

Themes turns existing `primaryThemes`, `themeIds`, and `dominantThemes` references in Books, Timeline Events, Eras, and the starter dataset into a real implemented slice instead of a seed-only placeholder. It adds a reusable narrative layer without changing the project-scoped Firestore model.

## What Remains Later

- delete flow
- linked navigation from books, eras, and timeline events into theme detail pages
- real entity pickers instead of raw ID entry
- stronger validation across cross-entity theme references
