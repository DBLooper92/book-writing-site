# Timeline Events

## Status

Implemented now as the seventh full entity slice and the first dedicated chronology slice.

## What Exists

- `types/timeline-event.ts`
- `lib/firebase/timeline-events.ts`
- `lib/timeline/create-route.ts`
- `lib/timeline/references.ts`
- `lib/timeline/workspace.ts`
- `hooks/use-timeline-events.ts`
- `hooks/use-timeline-event.ts`
- `hooks/use-timeline-form-options.ts`
- `hooks/use-timeline-workspace.ts`
- `components/timeline-events/timeline-event-form.tsx`
- `components/timeline-events/timeline-event-detail-section.tsx`
- `components/timeline-events/timeline-event-detail-view.tsx`
- `components/timeline/timeline-event-composer-sheet.tsx`
- `components/timeline/timeline-event-detail-lightbox.tsx`
- `components/timeline/timeline-workspace-controls.tsx`
- `components/timeline/timeline-workspace-event-card.tsx`
- `components/timeline/timeline-workspace-visual.tsx`
- `app/timeline/page.tsx`
- `app/timeline-events/page.tsx`
- `app/timeline-events/new/page.tsx`
- `app/timeline-events/[timelineEventId]/page.tsx`
- `app/timeline-events/[timelineEventId]/edit/page.tsx`

## Important Rules

- timeline event documents must live under `users/{uid}/projects/{projectId}/timeline_events/{eventId}`
- `/timeline` is the only top-level browse/create surface for timeline events; legacy `/timeline-events` index and new routes only redirect into the workspace
- the slice still owns the canonical timeline-event type, normalization, Firestore utilities, detail route, and edit route even though top-level authoring moved into `/timeline`
- chronology data currently uses start/end year fields with optional month/day precision, an optional same-date sequence number, and an optional freeform time label
- workspace cards should stay lightweight and open event inspection/editing in-place instead of routing authors away from `/timeline`
- the current form uses picker-style inputs for the main linked manuscript, character, location, worldbuilding, era, and continuity references already backed by real slices
- the current form can also open inline create lightboxes for those linked picker slices and should auto-select the new record back into the still-open event editor
- linked labels and warnings should resolve from already loaded project-scoped slice data instead of storing duplicate display metadata on timeline events
- query-driven workspace prefills should stay optional conveniences, not a second authoring model or a second persistence shape
- Firestore docs are normalized before use in the UI
- readable IDs are generated from the title with collision handling
- create and update writes should reject impossible date ranges, invalid month/day precision, and self-referential continuity links

## Current Role In The Architecture

Timeline Events turns chronology into a real project-scoped slice and now powers `/timeline` as the sole top-level chronology surface. It gives Books, Chapters, Scenes, Characters, Locations, and several worldbuilding slices a real chronology target to reference instead of relying on seed-only event documents, while keeping all timeline authoring grounded in one normalized document shape that now supports year/month/day placement, same-date ordering, optional time labels, in-place workspace viewing/editing, and nested linked-record creation from the event editor itself.

## What Remains Later

- delete flow
- richer entity pickers and linked navigation beyond the current first-pass connected slices
- deeper validation across manuscript and worldbuilding references
- richer continuity editing than the current picker-based predecessor/successor links and workspace-prefill flow
- chronology models beyond the current year/month/day plus sequence approach
