# Timeline Events

## Status

Implemented now as the dedicated chronology slice that powers the timeline workspace.

## What Exists

- `types/timeline-event.ts`
- `lib/firebase/timeline-events.ts`
- `lib/data/timeline-events.ts`
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
- the slice still owns the canonical timeline-event type, normalization, Supabase fetch/refetch utilities, detail route, and edit route even though top-level authoring moved into `/timeline`
- Supabase rows keep the same scoped shape through `user_id`, `project_id`, and the readable `id`
- chronology data currently uses start/end year fields with optional month/day precision, an optional same-date sequence number, and an optional freeform time label
- dated events sort from chronology fields, while hidden predecessor/successor IDs now serve only as internal insertion hints for undated notch-created events and legacy records
- workspace cards should stay lightweight and open event inspection/editing in-place instead of routing authors away from `/timeline`
- the current form uses picker-style inputs for the main linked manuscript, character, location, worldbuilding, and era references already backed by real slices
- the current form can also open inline create lightboxes for those linked picker slices and should auto-select the new record back into the still-open event editor
- timeline event detail chips opened from the workspace should inspect linked slice records in nested lightboxes instead of navigating away from the current timeline overlay flow
- linked labels and warnings should resolve from already loaded project-scoped slice data instead of storing duplicate display metadata on timeline events
- query-driven workspace prefills should stay optional conveniences, not a second authoring model or a second persistence shape
- create flows opened from timeline insertion notches should confirm blank-year saves and, when confirmed, inherit the most recent earlier dated block's year if one exists; otherwise they remain undated
- normalized records are used consistently in the UI
- readable IDs are generated from the title with collision handling
- create and update writes should reject impossible date ranges and invalid month/day precision, while still preserving legacy hidden continuity IDs when older records already have them
- workspace create/edit saves should trigger an immediate follow-up refetch of the active project's `timeline_events` query so the visible chronology updates in place without requiring a browser reload

## Current Role In The Architecture

Timeline Events turns chronology into a real project-scoped slice and now powers `/timeline` as the sole top-level chronology surface. The active runtime now uses Supabase fetch/refetch reads and writes through `lib/data/timeline-events.ts`. The old `lib/firebase/*` import path remains only as a compatibility shim. It gives Books, Chapters, Scenes, Characters, Locations, and several worldbuilding slices a real chronology target to reference instead of relying on seed-only event documents, while keeping all timeline authoring grounded in one normalized document shape that now supports year/month/day placement, same-date ordering, optional time labels, in-place workspace viewing/editing, nested linked-record detail inspection, and nested linked-record creation from the event editor itself.

## What Remains Later

- delete flow
- richer entity pickers and linked navigation beyond the current first-pass connected slices
- deeper validation across manuscript and worldbuilding references
- a decision on whether internal hidden insertion hints should remain legacy-only or be replaced with a clearer undated ordering mechanism
- a decision on whether `timeOfDayLabel` should stay display-only or gain a real sortable time value
- lighter-weight reference loading for picker and detail data so timeline authoring stays cost-aware
- chronology models beyond the current year/month/day plus sequence approach

