# Factions

## Status

Implemented now.

## What Exists

- `types/faction.ts`
- `lib/data/factions.ts`
- `hooks/use-factions.ts`
- `hooks/use-faction.ts`
- `components/factions/faction-form.tsx`
- `components/factions/faction-card.tsx`
- `components/factions/faction-detail-section.tsx`
- `app/factions/page.tsx`
- `app/factions/new/page.tsx`
- `app/factions/[factionId]/page.tsx`
- `app/factions/[factionId]/edit/page.tsx`

## Important Rules

- faction documents must stay project-scoped and map cleanly to `factions` rows keyed by `user_id`, `project_id`, and `id` during the Supabase migration
- the current UI depends on the active project
- the form is intentionally smaller than the full canonical faction type
- normalized records are used consistently in the UI
- readable IDs are generated from the name with collision handling
- seeded faction docs and newly created faction docs normalize into the same UI shape

## Why It Matters

Factions is the first implemented worldbuilding-link slice built directly on IDs already present in Characters, Locations, and Timeline Events. It proves those existing `factionIds` fields can now point at real scoped records without introducing a second architecture.

The active Factions runtime now uses the same Supabase-backed fetch/refetch pattern as the earlier migrated slices.

## What Remains Later

- delete flow
- richer cross-entity pickers
- linked navigation from faction references in other slices
- filtering, sorting, and search
- validation across cross-entity references


