# Organizations

## Status

Implemented now.

## What Exists

- `types/organization.ts`
- `lib/data/organizations.ts`
- `lib/firebase/organizations.ts`
- `hooks/use-organizations.ts`
- `hooks/use-organization.ts`
- `components/organizations/organization-form.tsx`
- `components/organizations/organization-card.tsx`
- `components/organizations/organization-detail-section.tsx`
- `app/organizations/page.tsx`
- `app/organizations/new/page.tsx`
- `app/organizations/[organizationId]/page.tsx`
- `app/organizations/[organizationId]/edit/page.tsx`

## Important Rules

- organization documents must live under `users/{uid}/projects/{projectId}/organizations/{organizationId}`
- Supabase rows now map closely to the existing Firestore shape using `user_id`, `project_id`, and `id`
- the slice follows the same list/create/detail/edit pattern used by the existing canon slices
- the initial form stays intentionally smaller than the canonical organization shape
- database rows and seeded records normalize into the same UI-ready type
- readable IDs are generated from the organization name with collision handling

## Current Role In The Architecture

Organizations turns seeded organization references in Governments, Religions, and the starter dataset into a real implemented slice instead of a seed-only placeholder. The active runtime now uses a simple Supabase fetch/refetch path for list, detail, create, and edit behavior. The old `lib/firebase/*` import path remains only as a compatibility shim.

## What Remains Later

- delete flow
- linked navigation from governments, religions, and future cross-entity references into organization detail pages
- real entity pickers instead of raw ID entry
- stronger validation across cross-entity organization references

