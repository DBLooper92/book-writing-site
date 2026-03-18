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
- Decision: Story-bible data must remain scoped under `users/{uid}/projects/{projectId}/...`.
- Why it stays in force: Project isolation is a hard architectural rule, and global entity collections would break ownership, active-project scoping, and slice consistency.

### D-004

- Origin: Early implemented slice
- Decision: Characters is the first reference entity slice and the baseline pattern for future slice work.
- Why it stays in force: Its type, normalization, Firestore utility, page flow, and form structure define the repo's current reusable slice architecture.

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
- Decision: Firestore access patterns must stay cost-aware, using the cheapest read, listener, and write approach that still provides a smooth single-author experience.
- Why it stays in force: The app is intentionally single-author first, low-complexity, and affordable to run, so data-access convenience should not quietly turn into unnecessary recurring Firestore cost.

### D-008

- Origin: First Notes slice implementation
- Decision: The first Notes implementation keeps notes as a flat project-scoped collection and treats `users/{uid}/projects/{projectId}.notesRootId` as an optional project-level pointer, not as proof of a required note-tree model.
- Why it stays in force: The current docs and seed data support project-scoped notes and a root-note pointer, but they do not define parent-child note structure strongly enough to justify inventing a hierarchy in the first pass.

### D-009

- Origin: First Books slice implementation
- Decision: Books is the first manuscript-structure slice and the baseline pattern for later manuscript-layer entity work.
- Why it stays in force: Chapters, scenes, and chronology records need a real parent manuscript entity, and Books now proves that manuscript-facing slices can still follow the same project-scoped entity pattern as the canon slices.
