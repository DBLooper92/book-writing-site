# Timeline Workspace

## Status

Implemented now as the first derived workspace built on top of an existing slice.

## What Exists

- `lib/timeline/workspace.ts`
- `hooks/use-timeline-workspace.ts`
- `components/timeline/timeline-workspace-controls.tsx`
- `components/timeline/timeline-workspace-event-card.tsx`
- `app/timeline/page.tsx`

## Important Rules

- the workspace reads from the active project's `timeline_events` records instead of introducing a second chronology collection
- chronology ordering, grouping, and filtering are derived from normalized `TimelineEvent` records
- undated events stay visible in a dedicated section rather than disappearing from the workspace
- linked navigation should prefer routes that already exist for the referenced project-scoped slices

## Current Role In The Architecture

The Timeline workspace turns `/timeline` into a real project-scoped chronology surface without changing the Firestore model. It gives the existing `timeline_events` slice grouped browsing, timeline-specific filters, and linked navigation while keeping timeline data grounded in the same normalized event records used elsewhere in the app.

## What Remains Later

- predecessor and successor editing in the timeline event form
- validation for impossible year ranges and broken linked IDs
- richer date models beyond the current year-first chronology fields
- alternative chronology views such as denser scanning or zoomed era views
