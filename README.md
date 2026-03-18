# BookWritingSite

BookWritingSite is a private story-bible and AI-assisted writing workspace for a long-form, multi-book fiction series. It is being built as a single-author system first, with structured canon data, wiki-style reference pages, timeline support, and AI writing tools sharing one maintainable app.

## Current Scope

The current repo already has:

- Firebase Auth with email/password flows
- user-owned projects plus active project switching
- Firestore-backed Characters pages
- Firestore-backed Locations pages
- Firestore-backed Notes pages
- a developer seeding flow for a default story-bible project
- a placeholder Timeline route

Characters, Locations, and Notes currently have list, create, detail, and edit flows. Delete flows, richer cross-entity linking, and the broader entity library are still future work.

## Local Development

```bash
npm run dev
```

Open `http://localhost:3000`.

## Architecture Summary

- Next.js App Router
- TypeScript
- Firebase Auth
- Firestore
- per-user, per-project data model
- active project stored on `users/{uid}.activeProjectId`

Story-bible entities must stay nested under:

- `users/{uid}/projects/{projectId}/{entityCollection}/{entityId}`

Global entity collections such as `characters/{characterId}` are not part of this architecture.

## Docs

- `AGENTS.md`: high-signal coding-agent entry point
- `docs/README.md`: documentation index and read order
- `docs/product/project-vision.md`: long-term product intent
- `docs/architecture/current-status.md`: implemented vs partial vs planned
- `docs/architecture/firestore-structure.md`: Firestore scoping rules
- `docs/patterns/entity-slice-pattern.md`: reference pattern for new slices

## Current Entity Status

- Implemented: `projects`, `characters`, `locations`, `notes`
- Placeholder routes only: `timeline`
- Seeded for future development, but not yet implemented as slices: `books`, `chapters`, `scenes`, `timeline_events`, `cultures`, `factions`, `languages`, `species`, `items`, `plot_threads`, `relationships`, `themes`, `eras`, `technologies`, `religions`, `governments`, `organizations`, `outlines`, `glossary_terms`, `attachments`, `ai_sessions`, `retcons`
