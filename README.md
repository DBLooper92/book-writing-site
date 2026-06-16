# Book Bible Desktop

Book Bible Desktop is a desktop-only, local-first writing workspace for a long-form, multi-book fiction series.

The active direction is:

- desktop app first
- local project folders
- local SQLite as structured source of truth
- review-first proposal workflows before canon apply

## Current Runtime

- Electron app shell and IPC runtime
- Next.js renderer embedded in the desktop app
- local project scaffold generation (`project.json`, `data/`, `exports/`, `proposals/`, `inbox/`)
- local SQLite document tables through `better-sqlite3`
- generated exports for canon/timeline/manuscript browsing
- draft/proposal status workflow (`pending`, `approved`, `rejected`, `applied`)

## Direction Change

This repository is now maintained as desktop-only.
Website-first guidance and web deployment workflows are no longer the project direction.

## Local Development

```bash
npm install
npm run dev
```

Production-like desktop preview:

```bash
npm run preview:desktop
```

Build desktop package:

```bash
npm run dist
```

## Project Scope Model

- one project folder per story project
- one local SQLite file per project (`data/project.sqlite`)
- entities remain project-scoped
- exports are generated views, not the source of truth

## Docs

- `AGENTS.md`: primary contributor instructions
- `docs/README.md`: documentation index and read order
- `docs/architecture/desktop-scope-model.md`: desktop ownership and scoping rules
- `docs/architecture/current-status.md`: implemented vs transitional vs planned
- `docs/architecture/next-steps.md`: short-term delivery priorities
- `docs/architecture/decision-log.md`: durable decisions
- `docs/ai/assistant-guidelines.md`: AI behavior inside this desktop repo

## Git Sync

This project is mirrored to `https://github.com/DBLooper92/book-writing-site`.

- Pull before work on any machine.
- Commit finished changes locally.
- Push the branch back to GitHub so the other machine can `git pull`.
- Keep machine-local files out of the repo; `.gitignore` excludes build output, logs, and environment files.

## Desktop Project Reference

Use `desktop-project-example/` as the reference shape for generated writing projects and review-first workflows.
