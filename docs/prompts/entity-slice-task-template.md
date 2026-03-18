# Entity Slice Task Template

Use this template when asking Codex to build a new entity slice.

## Prompt Template

Build a new `<entity>` slice inside this existing Next.js + Firebase project.

Before making changes, read:

- `AGENTS.md`
- `docs/README.md`
- `docs/architecture/current-status.md`
- `docs/architecture/firestore-structure.md`
- `docs/patterns/entity-slice-pattern.md`
- `docs/patterns/firestore-patterns.md`
- `docs/patterns/typing-and-normalization.md`
- `docs/patterns/ui-patterns.md`
- the most relevant existing feature docs
- the Characters slice as the reference implementation

Requirements:

- keep all entity data scoped under `users/{uid}/projects/{projectId}/<entityCollection>/{entityId}`
- do not create global collections
- follow the existing entity-slice file layout
- create canonical types, Firestore helpers, hooks, routes, and a reusable form
- keep the first-pass form intentionally small if needed
- normalize Firestore docs before use in the UI
- make the docs honest about implemented versus planned behavior

Deliverables:

- code changes for the slice
- any needed doc updates in `docs/features/`, `docs/architecture/current-status.md`, and related reference docs
- concise summary of assumptions and verification
