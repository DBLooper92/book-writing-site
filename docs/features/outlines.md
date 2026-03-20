# Outlines

## Status

Implemented now.

## What Exists

- `types/outline.ts`
- `lib/firebase/outlines.ts`
- `hooks/use-outlines.ts`
- `hooks/use-outline.ts`
- `components/outlines/outline-form.tsx`
- `components/outlines/outline-card.tsx`
- `components/outlines/outline-detail-section.tsx`
- `app/outlines/page.tsx`
- `app/outlines/new/page.tsx`
- `app/outlines/[outlineId]/page.tsx`
- `app/outlines/[outlineId]/edit/page.tsx`

## Important Rules

- outline documents must live under `users/{uid}/projects/{projectId}/outlines/{outlineId}`
- the current UI depends on the active project
- the first-pass form is intentionally smaller than the full canonical outline type
- Firestore docs are normalized before use in the UI
- readable IDs are generated from the title with collision handling
- seeded outline docs and user-created docs normalize into the same UI shape

## Why It Matters

The starter dataset already exposes structured planning records that connect books, plot threads, and notes. This slice turns those outline records into real navigable project-scoped data without introducing a second planning architecture.

## What Remains Later

- delete flow
- richer linked navigation from books, notes, and plot threads
- entity pickers instead of manual ID entry
- filtering, sorting, and search
- broader validation across outline-linked references
