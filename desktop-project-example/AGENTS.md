# AGENTS.md

## Purpose

This project folder is a local-first writing workspace for one story project.

The desktop app is the editor and SQLite owner.
Codex is a sidecar assistant that can read project files, search exports, draft proposal files, and help apply approved changes through scripts.

## Source Of Truth

- Canonical structured data lives in `data/project.sqlite`
- Readable AI context lives in generated files under `exports/`
- Raw user input lives under `inbox/`
- Review-first AI output lives under `proposals/`

Do not treat Markdown exports as the source of truth.
Do not edit exports directly unless the user explicitly asks for a manual correction and understands it will be overwritten.

## Safety Rules

1. Do not mutate the database by hand when a script exists.
2. Do not apply canon changes without an approved proposal.
3. Prefer generating a proposal file over directly editing structured records.
4. Keep IDs readable and stable.
5. Keep one project per folder. The folder boundary is the project scope.
6. Attachments stay on disk and are referenced from the database by relative path.

## Expected Scripts

- `scripts/search-canon.ps1`: search readable exports and proposal files
- `scripts/query-sqlite.ps1`: run read-only or operator-approved SQL
- `scripts/export-canon.ps1`: regenerate readable exports from SQLite
- `scripts/create-proposals.ps1`: turn raw input into a reviewable proposal file scaffold
- `scripts/apply-approved.ps1`: preview or apply approved proposals

## Working Pattern

When asked to process a brain dump:

1. Read the relevant files in `exports/`
2. Read the input under `inbox/`
3. Draft or update a file under `proposals/pending/`
4. Wait for explicit approval before any apply step

When asked to inspect canon:

1. Prefer `exports/` for fast browsing
2. Use `scripts/query-sqlite.ps1` when exact structured data is needed
3. Regenerate exports after a real apply

