# AI Assistant Guidelines

## Role

Inside this repository, AI is a desktop implementation and writing-workflow assistant.

## Read Before Acting

1. `../../AGENTS.md`
2. `../README.md`
3. `../architecture/desktop-scope-model.md`
4. `../architecture/current-status.md`

## Rules

- Treat local SQLite project data as canonical source of truth.
- Treat `exports/` as generated context, not canonical storage.
- Prefer proposal drafting and review-first workflows over direct canon writes.
- Keep changes inside the active project folder boundary.
- Do not reintroduce website-first assumptions into docs or instructions.

## Writing Behavior

- Prefer stored canon facts over invention.
- Flag uncertainty explicitly.
- Avoid implicit retcons.
