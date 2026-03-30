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
- `components/timeline/timeline-brain-dump-lightbox.tsx`
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
- the main chronology toolbar can launch a brain-dump lightbox beside the create button, but that flow should still use the signed-in user's saved OpenAI key and save its extraction output onto project-scoped `ai_sessions` rows rather than directly creating canon records
- timeline proposals saved from that brain-dump flow now carry review metadata, deterministic candidate matches against existing project timeline rows, same-dump duplicate signals, and persisted placement-suggestion data on the `ai_sessions` row
- timeline proposals in the AI-session review surface can now load targeted chronology context on demand, including matched or candidate event summaries, nearby chronology records, and linked character/chapter/scene summaries
- that targeted chronology context now also derives a first-pass placement recommendation plus focused continuity warnings for timeline proposal review
- those continuity warnings now also compare proposal-linked characters, chapters, and scenes against the current links on the matched or candidate anchor event
- timeline proposals in the AI-session review surface now also let the author persist review status, chosen action, placement, optional start/end years, and optional display date label back onto the scoped `ai_sessions` row before any canon write happens
- reviewed timeline proposals in that same AI-session review surface can now apply `create`, `update`, or `merge` decisions into real scoped `timeline_events` rows, reusing the existing timeline-event validation and write shape instead of bypassing the slice
- reviewed timeline proposals now also require an explicitly saved `reviewed` status and can target a saved matched existing event before any `update` or `merge` write runs
- the workspace event editor can open nested inline-create lightboxes for the current linked timeline-event picker slices and should reselect the newly created record without closing the editor
- linked chips inside workspace event detail should open nested record lightboxes instead of routing authors away from the current timeline overlay stack
- linked warnings should derive from already loaded project-scoped slice records instead of introducing a separate validation collection
- linked navigation should prefer routes that already exist for the referenced project-scoped slices
- workspace warnings should stay derived from loaded timeline data rather than introducing extra validation-only persistence
- workspace create/edit sheets should explicitly refetch `timeline_events` after a successful save so newly created or updated blocks appear without a manual page refresh

## Current Role In The Architecture

The Timeline workspace turns `/timeline` into the sole top-level project-scoped chronology surface without changing the project-scoped data model. It now gives the existing `timeline_events` slice a split-pane chronology workspace with a floating quick-map rail, a pinnable filter header, a center-line visual timeline, derived insertion points, query-driven create entry points, an in-place brain-dump lightbox next to the main create button, in-place event lightboxes, nested linked-record detail lightboxes, inline create/edit entry points, nested linked-record creation lightboxes inside the event editor, timeline-specific filters, year/month/day-aware chronology ordering, first-pass integrity warnings, and a timeline-first brain-dump review/apply path that stays grounded in the same normalized `timeline_events` records used elsewhere in the app.

## What Remains Later

- tighter chronology integrity checks around partial dates, same-date ordering, and range precision
- a decision on whether `timeOfDayLabel` should stay display-only or gain a real sortable time value
- lighter-weight or lazy reference loading so the workspace does not need every connected slice subscribed on first paint
- linked-ID validation against more entity slices than the current first-pass connected set
- AI-assisted placement review that can improve on the current first-pass placement recommendation with richer contradiction and chronology reasoning before the author applies changes
- contradiction warnings that compare proposed events against likely related timeline and character records before the author applies changes
- richer chronology models beyond the current year/month/day plus sequence fields, such as calendar-system support or finer-grained timestamps
- denser or zoomed chronology views for era-scale navigation


