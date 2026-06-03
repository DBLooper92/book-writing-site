# Desktop Scope Model

This repository now operates as a desktop-only system.

## Ownership Model

- The app creates and opens project folders on local disk.
- Each project folder is its own scope boundary.
- Each project folder owns one SQLite database at `data/project.sqlite`.

## Record Scope Rules

- Canon entities must remain scoped to the current project.
- IDs should remain readable and stable.
- Do not create cross-project global canon stores inside this repo.

## Source Of Truth

- Source of truth: structured records in local SQLite.
- Generated views: `exports/` markdown/json files.
- AI working input: `inbox/`.
- Review-first outputs: `proposals/`.

Exports are for browsing and context, not direct canonical editing.

## Mutation Rules

- Prefer app-managed or script-managed flows over ad hoc DB edits.
- Proposal review must happen before canonical apply.
- Keep file-path operations inside the project folder boundary.
