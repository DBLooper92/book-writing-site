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
