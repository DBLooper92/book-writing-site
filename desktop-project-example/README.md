# Desktop Project Example

This folder shows what one generated local-first writing project could look like after the desktop app creates it on disk.

The intent is:

- the desktop app owns the real structured data in `data/project.sqlite`
- Codex works against the project folder, not against a remote backend
- Codex reads AI-friendly exports and uses safe scripts for search, proposal generation, and apply
- nothing writes canon directly without an explicit review step

## Planned Runtime Shape

At runtime, the desktop app would create these generated files inside `data/`:

- `project.sqlite`
- `project.sqlite-wal`
- `project.sqlite-shm`

Those files are not faked here because the real database should be created by the app, not checked in as a text placeholder pretending to be SQLite.

## Folder Roles

- `AGENTS.md`: project-specific instructions for Codex
- `project.json`: project metadata and local path conventions
- `data/`: schema snapshot, migrations, seeds, and example queries
- `attachments/`: user-owned files stored on disk
- `inbox/`: raw author input such as brain dumps
- `exports/`: AI-readable summaries regenerated from the database
- `proposals/`: review-first AI outputs
- `scripts/`: the only approved entry points for scripted search/export/proposal/apply behavior

## Recommended Flow

1. The app creates this folder structure and initializes `data/project.sqlite`.
2. The app seeds starter data and regenerates `exports/`.
3. The user opens this folder as a Codex project.
4. Codex reads `AGENTS.md`, `exports/`, and `inbox/`.
5. Codex creates proposal files under `proposals/pending/`.
6. The user approves, edits, or rejects proposals.
7. The app or an approved script applies the reviewed proposals into SQLite.

## Why This Shape

This gives you:

- one obvious source of truth
- readable artifacts for AI browsing
- a filesystem boundary that already matches a single writing project
- a review-first AI workflow that does not depend on fragile prompt memory

