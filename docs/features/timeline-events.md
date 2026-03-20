# Timeline Events

## Status

Implemented now as the seventh full entity slice and the first dedicated chronology slice.

## What Exists

- `types/timeline-event.ts`
- `lib/firebase/timeline-events.ts`
- `lib/timeline/workspace.ts`
- `hooks/use-timeline-events.ts`
- `hooks/use-timeline-event.ts`
- `hooks/use-timeline-workspace.ts`
- `components/timeline-events/timeline-event-form.tsx`
- `components/timeline-events/timeline-event-card.tsx`
- `components/timeline-events/timeline-event-detail-section.tsx`
- `components/timeline/timeline-workspace-controls.tsx`
- `components/timeline/timeline-workspace-event-card.tsx`
- `app/timeline/page.tsx`
- `app/timeline-events/page.tsx`
- `app/timeline-events/new/page.tsx`
- `app/timeline-events/[timelineEventId]/page.tsx`
- `app/timeline-events/[timelineEventId]/edit/page.tsx`

## Important Rules

- timeline event documents must live under `users/{uid}/projects/{projectId}/timeline_events/{eventId}`
- the slice follows the same list/create/detail/edit pattern as the existing entity slices
- the first-pass form stays intentionally focused on chronology, public summary, and raw linked record IDs
- Firestore docs are normalized before use in the UI
- readable IDs are generated from the title with collision handling

## Current Role In The Architecture

Timeline Events turns chronology into a real project-scoped slice and now powers the working `/timeline` workspace as well. It gives Books, Chapters, Scenes, Characters, and Locations a real chronology target to reference instead of relying on seed-only event documents.

## What Remains Later

- delete flow
- richer entity pickers and linked navigation
- validation across manuscript and worldbuilding references
- deeper continuity editing and chronology validation on top of the current slice
