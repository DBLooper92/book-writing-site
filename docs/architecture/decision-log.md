# Decision Log

This file records durable architectural and product-direction decisions. Add new entries when the project makes a decision that future work should treat as settled unless explicitly revisited.

Backfilled entries below reflect decisions already visible in the current repo and docs, so some origins are marked as foundational instead of using an exact historical date.

## Entry Format

- ID
- Origin
- Decision
- Why it stays in force

## Decisions

### D-001

- Origin: Foundational
- Decision: Build BookWritingSite as a single-author system first, with broader product ambitions deferred until the personal workflow is solid.
- Why it stays in force: This keeps scope disciplined and favors practical writing-tool utility over premature multi-user or commercial abstractions.

### D-002

- Origin: Foundational
- Decision: Keep the product web-first instead of shifting to a desktop-first architecture.
- Why it stays in force: The app depends on browser-accessible AI workflows, easy access across environments, and a single maintainable deployment surface.

### D-003

- Origin: Foundational
- Decision: Story-bible data must remain scoped by both user and project.
- Why it stays in force: Project isolation is a hard architectural rule, and global unscoped entity rows would break ownership, active-project scoping, and slice consistency.

### D-004

- Origin: Early implemented slice
- Decision: Characters is the first reference entity slice and the baseline pattern for future slice work.
- Why it stays in force: Its type, normalization, data helper, page flow, and form structure define the repo's current reusable slice architecture.

### D-005

- Origin: Second implemented slice
- Decision: Locations is the second full slice and confirms that the Characters pattern is reusable instead of one-off.
- Why it stays in force: New slices should align with the shared Characters and Locations pattern unless there is a clear feature-specific reason to diverge.

### D-006

- Origin: Dev seeding policy
- Decision: Seeded collections and placeholder routes do not count as implemented slices.
- Why it stays in force: The repo uses seed data to expose structure early, but implementation status must be reserved for real types, data utilities, routes, and UI behavior.

### D-007

- Origin: Product and architecture constraint
- Decision: Backend access patterns must stay cost-aware, using the cheapest read, query, and write approach that still provides a smooth single-author experience.
- Why it stays in force: The app is intentionally single-author first, low-complexity, and affordable to run, so data-access convenience should not quietly turn into unnecessary recurring infrastructure cost.

### D-008

- Origin: First Notes slice implementation
- Decision: The first Notes implementation keeps notes as a flat project-scoped collection and treats `users/{uid}/projects/{projectId}.notesRootId` as an optional project-level pointer, not as proof of a required note-tree model.
- Why it stays in force: The current docs and seed data support project-scoped notes and a root-note pointer, but they do not define parent-child note structure strongly enough to justify inventing a hierarchy in the first pass.

### D-009

- Origin: First Books slice implementation
- Decision: Books is the first manuscript-structure slice and the baseline pattern for later manuscript-layer entity work.
- Why it stays in force: Chapters, scenes, and chronology records need a real parent manuscript entity, and Books now proves that manuscript-facing slices can still follow the same project-scoped entity pattern as the canon slices.

### D-010

- Origin: First Chapters slice implementation
- Decision: Chapters stays as a project-scoped top-level slice keyed by `user_id`, `project_id`, and `id`, and links back to books through `bookId` instead of nesting chapter records under books.
- Why it stays in force: This preserves the repo's flat per-project entity-slice architecture, keeps scoping consistent across slices, and avoids introducing a second persistence pattern just for manuscript child records.

### D-011

- Origin: First AI Sessions slice implementation
- Decision: The first AI Sessions implementation stores summarized session metadata, linked entity IDs, and prompt/output excerpts as project-scoped rows instead of inventing provider-specific runtime workflow state or treating AI chat transcripts as canon.
- Why it stays in force: Structured project data remains the source of truth, the slice stays cheap to run and inspect, and later AI tooling can extend this record shape without requiring the app to depend on transient chat state.

### D-012

- Origin: First Timeline workspace implementation
- Decision: The `/timeline` workspace must stay a derived view over project-scoped `timeline_events` rows instead of introducing a second chronology collection or separate timeline persistence model.
- Why it stays in force: This preserves the flat project-scoped architecture, avoids duplicate chronology data, keeps backend cost predictable, and ensures every timeline surface derives from the same normalized event records.

### D-013

- Origin: Visual timeline workspace expansion
- Decision: Timeline insertion notches and time-gap compression stay derived workspace behavior over sorted `timeline_events` data rather than persisted placeholder documents or stored spacing metadata.
- Why it stays in force: This keeps chronology data honest, avoids fake records just to support layout, preserves cheap reads and writes, and ensures inserting a real event automatically creates new before-and-after insertion points on the next render.

### D-014

- Origin: Inline timeline authoring expansion
- Decision: Inline timeline workspace creation and editing must reuse the same `timeline_events` normalization, validation, and write path as the dedicated create/edit routes instead of introducing a separate workspace-only payload shape.
- Why it stays in force: This avoids drift between timeline surfaces, keeps chronology writes predictable, and ensures the workspace remains a faster entry point into the same source-of-truth records rather than becoming a second authoring system.

### D-015

- Origin: Shared timeline reference validation expansion
- Decision: Timeline linked-label resolution and missing-link warnings should be derived from already loaded project-scoped slice records at read time rather than copied into timeline event documents as duplicated display metadata.
- Why it stays in force: This keeps `timeline_events` as the source of truth for linked IDs only, avoids stale duplicated labels, preserves the flat project-scoped model, and lets timeline surfaces improve their inspection UI without changing persisted chronology data.

### D-016

- Origin: Chronology precision expansion
- Decision: Timeline chronology precision should remain embedded directly on `timeline_events` as start/end year fields with optional month/day boundaries, optional same-date sequence ordering, and an optional freeform time label instead of introducing a second date object model or separate chronology-order records.
- Why it stays in force: This keeps the chronology model simple enough for the current single-author workflow, preserves compatibility with existing timeline data, improves ordering for tightly clustered events, and avoids turning the first-pass timeline into a heavier persistence system before the product proves it needs calendar-system or timestamp-level complexity.

### D-017

- Origin: Timeline surface consolidation
- Decision: `/timeline` is the only top-level timeline browse/create surface, while `/timeline-events` detail and edit routes remain supporting views over the same `timeline_events` records.
- Why it stays in force: This reduces redundant chronology navigation, keeps creation inside the higher-value visual workspace, and preserves one source of truth without removing the dedicated record-level routes that still help with inspection and focused editing.

### D-018

- Origin: Timeline chronology simplification pass
- Decision: Dated timeline events must sort strictly from their chronology fields, while insertion hints from timeline notches may remain only as hidden ordering help for undated events instead of a user-authored continuity model.
- Why it stays in force: This matches the product expectation that editing date fields should move blocks directly, avoids letting hidden relationship data override explicit chronology, keeps the workspace derived from `timeline_events`, and still preserves a lightweight way to keep undated blocks stable without introducing a second persisted ordering model.

### D-019

- Origin: Supabase migration start
- Decision: The first Supabase migration pass must keep the schema close to the current Firestore document shapes, avoid aggressive normalization, keep timeline sorting/filtering in the client, and prefer fetch/refetch patterns over realtime subscriptions.
- Why it stays in force: The migration goal is to replace backend services safely without redesigning product behavior, so the initial cutover should minimize data-shape drift and reduce moving parts until parity is stable.

### D-020

- Origin: Auth and project cutover
- Decision: Supabase Auth, profile-backed active-project state, and project CRUD now become the shared runtime baseline before the remaining entity slices are migrated.
- Why it stays in force: Firebase UID-based project scoping would block the rest of the Supabase slice migration, while cutting over the shared auth/project path first lets the remaining slices follow one consistent fetch/refetch pattern without redesigning the UI.

### D-021

- Origin: Supabase cleanup completion
- Decision: The active app runtime is now Supabase-only, and Firebase compatibility shims are no longer part of the maintained code path.
- Why it stays in force: This keeps the backend migration finished from a product-behavior perspective, removes obsolete Firebase surface area, and prevents drift between documentation and the actual runtime.
