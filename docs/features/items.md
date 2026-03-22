# Items

## Status

Implemented now.

## What Exists

- `types/item.ts`
- `lib/data/items.ts`
- `hooks/use-items.ts`
- `hooks/use-item.ts`
- `components/items/item-form.tsx`
- `components/items/item-card.tsx`
- `components/items/item-detail-section.tsx`
- `app/items/page.tsx`
- `app/items/new/page.tsx`
- `app/items/[itemId]/page.tsx`
- `app/items/[itemId]/edit/page.tsx`

## Important Rules

- item rows must stay scoped by `user_id`, `project_id`, and readable `id`
- the current UI depends on the active project
- the form stays intentionally small while still writing a canonical item shape
- Supabase rows preserve the same project-scoped record shape through `user_id`, `project_id`, and readable `id`
- normalized records are used consistently before they reach the UI
- readable IDs are generated from the item name with collision handling

## Why It Matters

Items turns existing references in Characters, Timeline Events, and the starter seed dataset into a real entity slice instead of a seed-only placeholder. It extends the established slice pattern into artifact and object records without changing the project-scoped data model. The active runtime now uses a simple Supabase fetch/refetch path for list, detail, create, and edit behavior.

## What Remains Later

- delete flow
- richer linked navigation to owners, locations, factions, and timeline events
- real entity pickers instead of raw ID entry
- validation across cross-entity item references


