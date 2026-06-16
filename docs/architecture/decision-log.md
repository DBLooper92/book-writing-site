# Decision Log

Durable decisions for this desktop repository.

## D-001

- Decision: Maintain this project as desktop-only from this point forward.
- Why: It aligns with current product intent and reduces split focus across web and desktop tracks.

## D-002

- Decision: Keep local SQLite and project-folder boundaries as the primary data ownership model.
- Why: It keeps project scope explicit and supports reliable local-first author workflows.

## D-003

- Decision: Keep review-first proposal/apply flow as the default for canon changes.
- Why: It preserves author control and avoids silent AI-driven canon mutation.

## D-004

- Decision: Treat generated exports as browsing context, not source-of-truth data.
- Why: Canon truth must remain in structured project storage.

## D-005

- Decision: Keep timeline-launched multi-event BrainDump review anchored in the timeline insertion gap.
- Why: Authors need to evaluate generated events in chronological context, and the locked gap prevents overlapping inserts while AI output is running or awaiting approval.

## D-006

- Decision: Reuse created entity records within a single AI draft apply pass when the same target/name pair appears again.
- Why: Repeated mentions in one BrainDump should resolve to one canonical slice instead of creating obvious duplicate rows.

## D-007

- Decision: Preserve raw multi-event BrainDump requests and responses in per-job NDJSON logs for debugging.
- Why: Prompt regressions and missing-detail bugs are only fixable when the exact request/response pair is available after the run.

## D-008

- Decision: Recover malformed-but-usable multi-event BrainDump chunk output when it contains clear event drafts, and surface the recovery as a warning.
- Why: Raw model output can drift from the requested envelope or truncate under dense input; preserving valid drafts is safer than silently losing story beats.

## D-009

- Decision: Keep a dedicated Scroll presentation for the timeline workspace alongside the existing visual chronology view, while reusing the same insertion/composer and edit sidebars.
- Why: Authors need a distraction-light reading pass for event descriptions without losing the same create, edit, and AI insertion workflows already wired into the timeline.

## D-010

- Decision: Store timeline bookmarks as a reserved tag on the event record and persist AI creation provenance directly on the same event row.
- Why: That keeps bookmark filtering and provenance rendering local to the canonical event record without introducing a separate bookmark table or transient job-state lookup.

## D-011

- Decision: Drive the timeline entity editor from a shared slice configuration map instead of separate per-slice modal handlers.
- Why: A single menu and modal path stays easier to extend as additional slices are added, and it keeps the index-route/view-all wiring aligned with the form that is actually rendered.

## D-012

- Decision: Treat the multi-event BrainDump surface as a card-based session composer where each card runs as its own AI event or manual entry.
- Why: Authors can separate beats explicitly, preserve bookmarks and order, and feed continuity from earlier cards without asking the model to split one large dump into multiple events.

## D-013

- Decision: Keep chapter-writing in a dedicated `/manuscript` route with a project-scoped manuscript table, and launch it from `Draft` as either a separate Electron window or a split-screen pane beside the scroll workspace.
- Why: Proposal-review drafts and manuscript drafting are different workflows, and the editor needs to stay consistent across launch modes while preserving blank chapter slots, sparse chapter expansion, and local autosave per project/book/chapter slot.

## D-014

- Decision: Treat split Scroll mode as two distinct panes under one app shell, with the scroll controls anchored to the left pane and the manuscript editor anchored to the right pane.
- Why: That matches the authoring mockup, keeps the left/right workflows visually separate, and makes the active pane emphasis and divider behavior easier to reason about.

## D-015

- Decision: Keep entity deletion focused on removing cross-entity link IDs and connection rows, while leaving descriptive text, summaries, and drafts intact.
- Why: Authors need the delete action to clean up broken references automatically without accidentally erasing the narrative content attached to the record.

## D-016

- Decision: Route timeline event deletion through the same generic entity cleanup path used by other record types.
- Why: Timeline events also participate in cross-entity ID links, so they should lose predecessor/successor and other connection fields when deleted instead of leaving broken references behind.
