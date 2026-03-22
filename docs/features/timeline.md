# Timeline Workspace

## Status

Implemented now as the first derived workspace built on top of an existing slice.

## What Exists

- `lib/timeline/create-route.ts`
- `lib/timeline/workspace.ts`
- `lib/timeline/layout.ts`
- `lib/timeline/references.ts`
- `hooks/use-timeline-workspace.ts`
- `hooks/use-timeline-form-options.ts`
- `components/timeline/timeline-workspace-controls.tsx`
- `components/timeline/timeline-event-composer-sheet.tsx`
- `components/timeline/timeline-event-detail-lightbox.tsx`
- `components/timeline/timeline-workspace-event-card.tsx`
- `components/timeline/timeline-workspace-visual.tsx`
- `app/timeline/page.tsx`

## Important Rules

- the workspace reads from the active project's `timeline_events` records instead of introducing a second chronology collection
- `/timeline` is the only top-level timeline browse/create surface; legacy `/timeline-events` index and new routes should only redirect here
- chronology ordering, grouping, and filtering are derived from normalized `TimelineEvent` records
- chronology precision currently uses start/end year with optional month/day fields, plus an optional same-date sequence number and optional time label
- dated events sort strictly from chronology fields, while undated blocks can still preserve notch insertion order through hidden internal predecessor/successor hints
- the workspace UI now uses a split-pane layout with a left quick-map rail, a top filter bar, and a direct chronology pane instead of stacked summary cards above the timeline
- insertion notches are derived UI affordances, not stored backend records
- saving a notch-created event without a start or end year should confirm the choice, then inherit the most recent earlier dated block's year when one exists so the new block stays anchored near the clicked insertion point
- numbered timeline markers are derived from the current sorted chronology and should always renumber from top to bottom as the visible order changes
- large chronology gaps should compress into labeled jumps instead of proportional empty space
- undated events stay visible in the same derived chronology surface rather than disappearing from the workspace
- the quick-map rail should keep its own scroll area on large screens so authors can scan blocks without moving the main timeline pane
- the right side should stay reduced to the filter bar plus the chronology itself, without a separate overview card above the visual timeline
- the filter bar sits at the top of the chronology pane and can be pinned or unpinned without changing the underlying filter model
- inline workspace authoring should still write to the same `timeline_events` documents and reuse the same normalization and validation path as the dedicated detail/edit surfaces
- workspace event viewing and editing should prefer in-place lightboxes and sheets over routing authors away from `/timeline`
- the workspace event editor can open nested inline-create lightboxes for the current linked timeline-event picker slices and should reselect the newly created record without closing the editor
- linked chips inside workspace event detail should open nested record lightboxes instead of routing authors away from the current timeline overlay stack
- linked warnings should derive from already loaded project-scoped slice records instead of introducing a separate validation collection
- linked navigation should prefer routes that already exist for the referenced project-scoped slices
- workspace warnings should stay derived from loaded timeline data rather than introducing extra validation-only persistence
- workspace create/edit sheets should explicitly refetch `timeline_events` after a successful save so newly created or updated blocks appear without a manual page refresh

## Current Role In The Architecture

The Timeline workspace turns `/timeline` into the sole top-level project-scoped chronology surface without changing the project-scoped data model. It now gives the existing `timeline_events` slice a split-pane chronology workspace with a floating quick-map rail, a pinnable filter header, a center-line visual timeline, derived insertion points, query-driven create entry points, in-place event lightboxes, nested linked-record detail lightboxes, inline create/edit entry points, nested linked-record creation lightboxes inside the event editor, timeline-specific filters, year/month/day-aware chronology ordering, and first-pass integrity warnings while keeping timeline data grounded in the same normalized event records used elsewhere in the app.

## What Remains Later

- tighter chronology integrity checks around partial dates, same-date ordering, and range precision
- a decision on whether `timeOfDayLabel` should stay display-only or gain a real sortable time value
- lighter-weight or lazy reference loading so the workspace does not need every connected slice subscribed on first paint
- linked-ID validation against more entity slices than the current first-pass connected set
- richer chronology models beyond the current year/month/day plus sequence fields, such as calendar-system support or finer-grained timestamps
- denser or zoomed chronology views for era-scale navigation


