# Locations

## Status

Implemented now as the second full entity slice.

## What Exists

- `types/location.ts`
- `lib/data/locations.ts`
- `hooks/use-locations.ts`
- `hooks/use-location.ts`
- `components/locations/location-form.tsx`
- `components/locations/location-card.tsx`
- `components/locations/location-detail-section.tsx`
- `app/locations/page.tsx`
- `app/locations/new/page.tsx`
- `app/locations/[locationId]/page.tsx`
- `app/locations/[locationId]/edit/page.tsx`

## Important Rules

- location documents must stay project-scoped and map cleanly to `locations` rows keyed by `user_id`, `project_id`, and `id` during the Supabase migration
- the slice follows the same list/create/detail/edit pattern as Characters
- the form is intentionally focused even though the canonical type is broader
- parent and related IDs are stored as strings or arrays for future linking

## Current Role In The Architecture

Locations confirms that the Characters pattern is reusable rather than one-off. New slices should align with both Characters and Locations instead of diverging.

The active Locations runtime now uses the same Supabase-backed fetch/refetch pattern as Books and Characters.

## What Remains Later

- delete flow
- real relationship pickers for parent and related entities
- linked navigation to related records
- stronger validation for hierarchical location data


