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
- `components/timeline/timeline-workspace-event-card.tsx`
- `components/timeline/timeline-workspace-visual.tsx`
- `app/timeline/page.tsx`

## Important Rules

- the workspace reads from the active project's `timeline_events` records instead of introducing a second chronology collection
- `/timeline` is the only top-level timeline browse/create surface; legacy `/timeline-events` index and new routes should only redirect here
- chronology ordering, grouping, and filtering are derived from normalized `TimelineEvent` records
- chronology precision currently uses start/end year with optional month/day fields, plus an optional same-date sequence number and optional time label
- insertion notches are derived UI affordances, not stored Firestore documents
- large chronology gaps should compress into labeled jumps instead of proportional empty space
- undated events stay visible in the same derived chronology surface rather than disappearing from the workspace
- inline workspace authoring should still write to the same `timeline_events` documents and reuse the same normalization and validation path as the dedicated detail/edit surfaces
- linked warnings should derive from already loaded project-scoped slice records instead of introducing a separate validation collection
- linked navigation should prefer routes that already exist for the referenced project-scoped slices
- workspace warnings should stay derived from loaded timeline data rather than introducing extra validation-only persistence

## Current Role In The Architecture

The Timeline workspace turns `/timeline` into the sole top-level project-scoped chronology surface without changing the Firestore model. It now gives the existing `timeline_events` slice a center-line visual timeline, dense quick navigation, derived insertion points, query-driven create entry points, inline create/edit entry points, resolved linked labels, timeline-specific filters, linked navigation, year/month/day-aware chronology ordering, and first-pass integrity warnings while keeping timeline data grounded in the same normalized event records used elsewhere in the app.

## What Remains Later

- linked-ID validation against more entity slices than the current first-pass connected set
- richer timeline authoring flows such as hover summaries, deeper block inspection, and more contextual insertion behavior
- richer chronology models beyond the current year/month/day plus sequence fields, such as calendar-system support or finer-grained timestamps
- denser or zoomed chronology views for era-scale navigation
