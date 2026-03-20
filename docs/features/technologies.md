# Technologies

## Status

Implemented now.

## What Exists

- `types/technology.ts`
- `lib/firebase/technologies.ts`
- `hooks/use-technologies.ts`
- `hooks/use-technology.ts`
- `components/technologies/technology-form.tsx`
- `components/technologies/technology-card.tsx`
- `components/technologies/technology-detail-section.tsx`
- `app/technologies/page.tsx`
- `app/technologies/new/page.tsx`
- `app/technologies/[technologyId]/page.tsx`
- `app/technologies/[technologyId]/edit/page.tsx`

## Important Rules

- technology documents must live under `users/{uid}/projects/{projectId}/technologies/{technologyId}`
- the current UI depends on the active project
- the first-pass form is intentionally smaller than the full canonical technology type
- Firestore docs are normalized before use in the UI
- readable IDs are generated from the name with collision handling
- seeded technology docs and user-created docs normalize into the same UI shape

## Why It Matters

Timeline Events and the starter dataset already point at technology records. This slice turns those references into real navigable canon data without changing the existing project-scoped entity architecture.

## What Remains Later

- delete flow
- richer linked navigation from timeline events and related entities
- entity pickers instead of manual ID entry
- filtering, sorting, and search
- broader validation across technology-linked references
