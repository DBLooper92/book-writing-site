# Entity Slice Task Template

Use this template when asking Codex to build a new entity slice.

## Prompt Template

Build a new `<entity>` slice inside this existing Next.js + Supabase project.

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

- keep all entity data scoped by `user_id`, `project_id`, and readable `id`
- do not create global unscoped entity rows
- follow the existing entity-slice file layout
- create canonical types, Supabase data helpers, hooks, routes, and a reusable form
- keep the first-pass form intentionally small if needed
- normalize backend rows before use in the UI
- make the docs honest about implemented versus planned behavior

Deliverables:

- code changes for the slice
- any needed doc updates in `docs/features/`, `docs/architecture/current-status.md`, and related reference docs
- concise summary of assumptions and verification
