# BookWritingSite

BookWritingSite is a private story-bible and AI-assisted writing workspace for a long-form, multi-book fiction series. It is being built as a single-author system first, with structured canon data, wiki-style reference pages, timeline support, and AI writing tools sharing one maintainable app.

## Current Scope

The current repo already has:

- Firebase Auth with email/password flows
- user-owned projects plus active project switching
- Firestore-backed Books pages
- Firestore-backed Chapters pages
- Firestore-backed Scenes pages
- Firestore-backed Characters pages
- Firestore-backed Relationships pages
- Firestore-backed Factions pages
- Firestore-backed Cultures pages
- Firestore-backed Religions pages
- Firestore-backed Governments pages
- Firestore-backed Organizations pages
- Firestore-backed Plot Threads pages
- Firestore-backed Outlines pages
- Firestore-backed Glossary Terms pages
- Firestore-backed Eras pages
- Firestore-backed Themes pages
- Firestore-backed Languages pages
- Firestore-backed Species pages
- Firestore-backed Items pages
- Firestore-backed Technologies pages
- Firestore-backed Locations pages
- Firestore-backed Timeline Events pages
- a Timeline workspace route with grouped chronology browsing and filters
- Firestore-backed Notes pages
- Firestore-backed Retcons pages
- Firestore-backed Attachments pages
- Firestore-backed AI Sessions pages
- a developer seeding flow for a default story-bible project

Books, Chapters, Scenes, Characters, Relationships, Factions, Cultures, Religions, Governments, Organizations, Plot Threads, Outlines, Glossary Terms, Eras, Themes, Languages, Species, Items, Technologies, Locations, Timeline Events, Notes, Retcons, Attachments, and AI Sessions currently have list, create, detail, and edit flows. The `/timeline` workspace now adds grouped chronology browsing and filters on top of `timeline_events`. Delete flows, richer cross-entity linking, deeper timeline continuity tooling, upload/storage workflow, and richer AI tooling are still future work.

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

- Implemented: `projects`, `books`, `chapters`, `scenes`, `characters`, `relationships`, `factions`, `cultures`, `religions`, `governments`, `organizations`, `plot_threads`, `outlines`, `glossary_terms`, `eras`, `themes`, `languages`, `species`, `items`, `technologies`, `locations`, `timeline_events`, `notes`, `retcons`, `attachments`, `ai_sessions`
- Implemented supporting systems: `auth`, `dev setup`, `timeline`
- Seeded for future development, but not yet implemented as slices: none in the current roadmap
