# AGENTS.md

## Purpose

Book Bible Desktop is now desktop-only.

It is a local-first, single-author writing environment for long-form fiction with:

- structured canon records in local SQLite
- generated exports for fast AI browsing
- review-first proposal files before canon apply
- timeline, manuscript, and worldbuilding slices in one app

Structured project data is the source of truth. AI supports language and planning work; it does not replace schema or canon ownership.

## Runtime Stack

- Electron main process (`electron/`)
- Next.js renderer UI (`app/`, `components/`, `hooks/`)
- TypeScript
- local SQLite document tables (`better-sqlite3`)
- local filesystem project folders under Documents

## Hard Data Rule

Story-bible entities must remain project-scoped in local storage.

- one project folder per story project
- one SQLite database per project: `data/project.sqlite`
- records stay anchored to project scope (`project_id` + readable `id`)

Do not introduce global cross-project canon rows.

## Current Reality

Implemented now:

- desktop launcher and recent-project workflow
- project scaffold generation and local manifest handling
- local SQLite-backed CRUD for the current entity tables
- generated exports under `exports/`
- proposal lifecycle folders (`pending`, `approved`, `rejected`, `applied`)
- draft/proposal watcher and apply flow hooks in Electron IPC
- renderer routes for the current slice UI, including timeline workflows

## Version Control

- GitHub origin: `https://github.com/DBLooper92/book-writing-site`
- Use `git pull` before starting work on any machine.
- Use `git commit` and `git push` after finishing a coherent change set.
- Keep local secrets in ignored `.env` files and do not commit them.
- Do not commit generated runtime output such as `node_modules/`, `.next/`, `dist/`, or log files.
- The tracked packaging asset in `build/` is `build/icon.ico`.

Transitional reality:

- renderer code still includes legacy Supabase-oriented wording in some UI/data modules
- desktop runtime is local-first and should be treated as canonical direction from this point forward

## Architectural Rules

1. Keep canon data in structured local project storage, not chat memory.
2. Reuse the current entity-slice pattern instead of inventing one-offs.
3. Keep normalization boundaries explicit before UI render.
4. Prefer safe, review-first proposal workflows over direct record mutation.
5. Keep docs honest about implemented versus planned behavior.
6. Keep read/write paths predictable and cheap in local runtime.

## How To Approach Work

- Read `docs/README.md` first.
- Follow desktop-first architecture docs under `docs/architecture/`.
- Use `desktop-project-example/` as the reference for folder shape and review-first workflows.
- Do not treat archived web-repo docs as active guidance for this project.

## Documentation Maintenance

After meaningful code changes, update matching docs in the same pass:

- `docs/architecture/current-status.md`
- `docs/architecture/next-steps.md`
- `docs/architecture/decision-log.md` for durable decisions
- any other doc made stale by the change

## Read Next

- `README.md`
- `docs/README.md`
- `docs/architecture/desktop-scope-model.md`
- `docs/architecture/current-status.md`
- `docs/architecture/decision-log.md`
- `docs/architecture/next-steps.md`
- `docs/ai/assistant-guidelines.md`
- `desktop-project-example/AGENTS.md`
