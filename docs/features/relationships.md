# Relationships

## Status

Implemented now.

## What Exists

- `types/relationship.ts`
- `lib/firebase/relationships.ts`
- `hooks/use-relationships.ts`
- `hooks/use-relationship.ts`
- `components/relationships/relationship-form.tsx`
- `components/relationships/relationship-card.tsx`
- `components/relationships/relationship-detail-section.tsx`
- `app/relationships/page.tsx`
- `app/relationships/new/page.tsx`
- `app/relationships/[relationshipId]/page.tsx`
- `app/relationships/[relationshipId]/edit/page.tsx`

## Important Rules

- relationship documents must live under `users/{uid}/projects/{projectId}/relationships/{relationshipId}`
- the current UI depends on the active project
- the form is intentionally smaller than the full canonical relationship type
- Firestore docs are normalized before use in the UI
- readable IDs are generated from the relationship title with collision handling
- relationship records can link different entity collections, not just two character docs

## Why It Matters

Relationships turns existing cross-entity references into a real slice instead of leaving them as seed-only structure. It provides a project-scoped place to track:

- who or what is connected
- what kind of connection it is
- the current state of that connection
- tensions, strengths, and background history

## What Remains Later

- delete flow
- richer entity pickers instead of free-text IDs
- linked navigation from entity IDs to destination detail pages
- validation that linked IDs exist in the active project
- broader relationship graphs and filtering
