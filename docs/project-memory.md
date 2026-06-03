# Project Memory

Last oriented: 2026-06-03.

## What This App Is

Book Bible Desktop is a desktop-only, local-first writing workspace for long-form fiction and story-bible work. It combines manuscript, timeline, and worldbuilding slices in one Electron app, with reviewable AI-assisted proposal files as a supporting workflow.

It is not a website-first product, a hosted Supabase app, a multi-user cloud canon store, or an AI memory substitute for structured project data. AI may help summarize, draft, parse brain dumps, and propose canon changes, but the author-owned structured project data remains the source of truth.

## Architecture And Runtime

- Electron main process in `electron/` owns desktop runtime, IPC, project open/create, local settings, SQLite access, attachment file access, exports, draft/proposal operations, OpenAI key storage, and AI jobs.
- Next.js renderer in `app/`, `components/`, and `hooks/` provides the UI inside Electron.
- TypeScript is used for renderer/types. Electron runtime files are CommonJS JavaScript.
- Local SQLite uses `better-sqlite3`.
- Project folders live under local disk, defaulting to `~/Documents/BookWritingProjects`.
- Renderer data modules still often look like Supabase query code, but `lib/supabase/browser.ts` is a local compatibility adapter over `window.bookBible` IPC.
- Next is configured with `output: "standalone"` for packaged Electron startup.

## Source Of Truth Rules

- Canonical story-bible data lives in the current project SQLite database: `data/project.sqlite`.
- Generated exports under `exports/` are browsing/context views only.
- Raw author input belongs under `inbox/`.
- AI/review outputs belong under `proposals/`.
- Do not introduce global cross-project canon rows.
- Keep canon changes project-scoped and review-first.
- Prefer app-managed or script-managed flows over ad hoc database edits.
- Do not edit generated exports as durable canon; they can be overwritten.

Important code nuance: `electron/database.js` stores each entity table as document rows with `id`, `slug`, timestamps, and `document_json`. It strips `user_id`, `project_id`, and `owner_id` before writing, then rehydrates `user_id`, `owner_id`, and `project_id` when reading. The project boundary is the per-project database and current runtime, not repeated physical `project_id` columns in every live table.

## Desktop Project Model

Each story project is one folder with one local SQLite database. The scaffold includes:

- `project.json`
- `data/project.sqlite`
- `attachments/images/` and `attachments/documents/`
- `exports/canon/`, `exports/manuscript/`, `exports/timeline/`, `exports/indexes/`
- `inbox/brain-dumps/`
- `prompts/`
- `proposals/pending/`, `approved/`, `rejected/`, `applied/`
- `scripts/`

The app creates/repairs this shape through `electron/templates.js`. `desktop-project-example/` is the reference folder shape and workflow example, but its checked-in SQL schema is not the same as the current live document-table runtime.

## Implemented Now

- Desktop launcher with recent projects, create project, open existing project, reveal, remove recent, and current project state.
- Project scaffold generation with manifest, directories, prompt templates, and helper scripts.
- Per-project SQLite document-table runtime for current entity slices.
- Local auth/profile shim using the single local desktop user.
- Renderer entity routes for books, chapters, scenes, characters, relationships, factions, cultures, religions, governments, organizations, plot threads, outlines, glossary terms, eras, themes, languages, species, items, technologies, locations, timeline events, notes, retcons, attachments, drafts, AI jobs, timeline, profile, and project overview.
- Generated markdown/json exports after record writes and on project open.
- Proposal lifecycle folders and Electron IPC for list/get/save/approve/reject/apply.
- Draft apply requires valid JSON and `approved` status before mutating SQLite.
- Attachment storage on local disk with preview URLs through the `bookbible-file://` protocol.
- OpenAI key storage and usage dashboard through Electron app data, with environment fallback for `OPENAI_API_KEY` or `BOOK_BIBLE_OPENAI_API_KEY`.
- AI summary generation and timeline brain-dump preview/job flows.
- Vitest coverage for some AI, draft schema, timeline route, and validation fixtures.

## Transitional Areas

- Many renderer pages and data modules still mention Supabase, `user_id`, and `project_id` in UI copy or compatibility code.
- `types/database.ts` is still shaped like the old table/row model and includes cloud-era fields. It is used by the local Supabase-compatible adapter.
- `lib/supabase/browser.ts` is intentionally named like Supabase but currently returns a local IPC-backed client.
- Some scripts under `scripts/` are machine-specific validation helpers using hard-coded `C:/Users/veloc/...` paths. Treat them as local test utilities, not portable workflow commands.
- `desktop-project-example/data/schema.sql` and migrations show a normalized/foreign-key snapshot, while the live app currently creates generic document tables.

## Planned Or Current Priorities

- Remove outdated web/Supabase wording from user-facing renderer copy.
- Audit data-layer naming where legacy web terms mislead contributors.
- Harden local-first proposal review/apply ergonomics.
- Keep docs aligned with actual desktop runtime behavior.
- Avoid website-first deployment work unless explicitly requested.

## Folder Map

- `AGENTS.md`: primary repo instructions and guardrails.
- `README.md`: short product/runtime summary and common commands.
- `app/`: Next.js App Router pages for launcher and all workspace routes.
- `components/`: reusable UI by entity slice plus layout, navigation, timeline, AI, providers, attachments.
- `hooks/`: client hooks for active project, local user/project state, entities, OpenAI config, timeline workspace.
- `lib/data/`: entity CRUD/normalization modules, mostly written against the local Supabase-compatible adapter.
- `lib/supabase/browser.ts`: local IPC-backed replacement for the old Supabase browser client.
- `lib/drafts/`: proposal JSON validation and apply-field patch helpers.
- `lib/timeline/`: timeline workspace, layout, references, create-route, and AI draft apply helpers.
- `lib/ai/`: renderer-side AI capability helpers/tests.
- `lib/auth/`: local desktop auth user shim.
- `electron/`: Electron main/preload/runtime services, SQLite document store, exports, drafts, OpenAI store, AI utilities.
- `types/`: shared TypeScript models for entities, database-like rows, Electron API, timeline, AI brain dumps.
- `docs/`: active desktop-first documentation.
- `desktop-project-example/`: reference project folder shape, exports, proposals, scripts, and example docs.
- `scripts/`: repo-level launch/seed/validation helpers.
- `build/icon.ico`: only tracked packaging asset under `build/`.
- `public/`: default static assets from the Next app.

## Common Commands

- `git pull`: run before starting work on a machine.
- `npm install`: install dependencies; postinstall rebuilds Electron app deps.
- `npm run dev`: run Next dev server and Electron together.
- `powershell -ExecutionPolicy Bypass -File scripts/launch-book-bible-desktop-dev.ps1`: Windows helper for dev launch when PATH is awkward.
- `npm run lint`: run ESLint.
- `npm test`: run Vitest once.
- `npm run build`: build the Next renderer.
- `npm run dist`: build the renderer and package the Electron app.
- `npm run rebuild:electron`: rebuild native Electron dependencies.

## Git Workflow

- Remote configured locally: `origin git@github.com:DBLooper92/book-writing-site.git`.
- Docs mention `https://github.com/DBLooper92/book-writing-site`; the actual local remote currently uses SSH for fetch and push.
- Current branch during this orientation: `master` tracking `origin/master`.
- Pull before work on each machine.
- Commit coherent finished changes.
- Push after finishing so the other machine can pull.
- Do not commit secrets, `.env*`, generated runtime output, `.next/`, `dist/`, `node_modules/`, logs, or local/private notes.
- Keep `build/icon.ico` tracked; `.gitignore` excludes other `build/` contents.

## Read Before Editing

Read in this order:

1. `AGENTS.md`
2. `README.md`
3. `docs/README.md`
4. `docs/architecture/desktop-scope-model.md`
5. `docs/architecture/current-status.md`
6. `docs/architecture/decision-log.md`
7. `docs/architecture/next-steps.md`
8. `docs/ai/assistant-guidelines.md`
9. `desktop-project-example/AGENTS.md`

For project-folder workflow details, also skim `desktop-project-example/README.md`, `desktop-project-example/data/README.md`, `desktop-project-example/exports/README.md`, and `desktop-project-example/proposals/README.md`.

## Conventions And Guardrails

- Reuse the existing entity-slice pattern: `types/*`, `lib/data/*`, `hooks/use-*`, `components/<slice>/*`, and `app/<slice>/*`.
- Keep normalization boundaries explicit before rendering UI.
- Keep IDs readable and stable.
- Keep file operations inside the current project folder boundary.
- Regenerate exports after canonical record writes.
- Draft/proposal JSON must include `id`, `projectId`, `createdAt`, `sourceFile`, `status`, `summary`, and `proposedChanges[]`.
- Proposal changes use `slice`, `action`, `targetId`, `confidence`, `reason`, and `fields`.
- Supported draft actions are `create`, `update`, and `merge`.
- Supported draft statuses are `pending-review`, `approved`, `rejected`, and `applied`.
- Apply only approved valid drafts.
- Attachments are disk files referenced by records; image/document buckets map to project `attachments/images` and `attachments/documents`.
- Do not treat archived web-repo docs or website deployment patterns as active guidance.
- After meaningful code changes, update matching docs, especially current status, next steps, and decision log when a durable decision changes.

## Inconsistencies And Confusing Areas

- Repo docs say records stay anchored by `project_id` plus readable `id`; live SQLite document tables strip `project_id` from stored documents and rehydrate it from the open project runtime.
- `desktop-project-example/data/schema.sql` has normalized tables with foreign keys, but `electron/database.js` creates document tables. Prefer live code for current behavior.
- UI copy still says "Supabase rows filtered by user_id and project_id" in many routes, and some attachment UI mentions Supabase Storage, even though runtime storage is local.
- `docs/README.md` says the old web app repo moved outside this folder, but legacy naming remains inside this repo for compatibility.
- `scripts/test-digital-prison-brain-dumps.js` and `scripts/seed-digital-prison.py` are not portable because they hard-code another Windows user path.
- Some scaffolded helper scripts in generated project folders are reminders/placeholders because the desktop app owns actual SQLite bootstrap/export/apply behavior.

## Open Questions And Risks

- Should the long-term SQLite model remain generic document tables, or migrate toward the normalized schema represented in `desktop-project-example/data/schema.sql`?
- Should `types/database.ts` and `lib/data/*` be renamed away from Supabase concepts, or kept as a compatibility layer until a larger data-layer cleanup?
- How much of the currently implemented AI job/validation flow is intended for general users versus local development/testing?
- Proposal apply currently performs field patching into document JSON; deeper relationship integrity is limited by the document-table model.
- Generated exports are broad and cheap, but any code depending on exact export filenames should check `electron/exports.js` because capitalization differs in places such as `Books.md`.
- OpenAI model defaults and API behavior can change; verify against current OpenAI docs before substantial AI-runtime changes.

## Reusable Work Checklist

1. `git pull`
2. Read the active docs in the order above.
3. Check `git status --short --branch` and protect unrelated user changes.
4. Locate the slice or Electron service that already owns the behavior.
5. Prefer local project/SQLite/proposal flows over global or hosted assumptions.
6. Make the smallest coherent change.
7. Update docs in the same pass when behavior or direction changes.
8. Run relevant checks, usually `npm run lint` and `npm test`.
9. Review `git diff`.
10. Commit and push the coherent change set.
