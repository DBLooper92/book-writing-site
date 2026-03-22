# BookWritingSite

BookWritingSite is a private story-bible and AI-assisted writing workspace for a long-form, multi-book fiction series. It is being built as a single-author system first, with structured canon data, wiki-style reference pages, timeline support, and AI writing tools sharing one maintainable app.

The runtime now uses Supabase Auth, Supabase-backed projects, and Supabase-backed entity slices across the full story-bible surface, including Timeline Events and the `/timeline` workspace.

## Current Scope

The current repo already has:

- Supabase Auth with email/password flows
- dedicated email-verification and post-verification screens for signup confirmation
- Supabase-backed user-owned projects plus active project switching
- post-sign-in routing that sends users without projects to `/projects/new` and otherwise resumes the last remembered in-app route for the active project
- Supabase-backed Books pages
- Supabase-backed Chapters pages
- Supabase-backed Scenes pages
- Supabase-backed Characters pages
- Supabase-backed Locations pages
- Supabase-backed Factions pages
- Supabase-backed Cultures pages
- Supabase-backed Religions pages
- Supabase-backed Themes pages
- Supabase-backed Eras pages
- Supabase-backed Technologies pages
- Supabase-backed Plot Threads pages
- Supabase-backed Governments pages
- Supabase-backed Organizations pages
- Supabase-backed Languages pages
- Supabase-backed Species pages
- Supabase-backed Items pages
- Supabase-backed Outlines pages
- Supabase-backed Glossary Terms pages
- Supabase-backed Notes pages
- Supabase-backed Retcons pages
- Supabase-backed Attachments pages
- Supabase-backed AI Sessions pages
- Supabase-backed Relationships pages
- Supabase-backed Timeline Event detail and edit pages
- a Timeline workspace route with a visual center-line chronology, quick navigation, filters, and inline authoring
- a developer seeding flow for a default story-bible project

Books, Chapters, Scenes, Characters, Relationships, Factions, Cultures, Religions, Governments, Organizations, Plot Threads, Outlines, Glossary Terms, Eras, Themes, Languages, Species, Items, Technologies, Locations, Timeline Events, Notes, Retcons, Attachments, and AI Sessions currently have list, create, detail, and edit flows. `/timeline` remains the sole top-level chronology surface for browsing and creating timeline records. The workspace adds a visual center-line chronology, quick navigation, filters, derived insertion notches, compressed time-jump markers, and inline create/edit entry points on top of `timeline_events`, while Timeline Events supports picker-style linking for the main connected slices. Delete flows, richer cross-entity linking, deeper timeline continuity tooling, upload/storage workflow, and richer AI tooling are still future work.

## Local Development

```bash
npm run dev
```

Open `http://localhost:3000`.

Current env requirements:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`

## Architecture Summary

- Next.js App Router
- TypeScript
- Supabase Auth
- Supabase Postgres data access for the active runtime
- per-user, per-project data model
- active project stored on the current user profile

Story-bible entities must stay scoped by:

- `user_id`
- `project_id`
- the slice table plus readable `id`

Global entity rows without user and project scope are not part of this architecture.

## Docs

- `AGENTS.md`: high-signal coding-agent entry point
- `docs/README.md`: documentation index and read order
- `docs/product/project-vision.md`: long-term product intent
- `docs/architecture/current-status.md`: implemented vs partial vs planned
- `docs/architecture/project-scope-model.md`: current Supabase scoping model for users, projects, and entity rows
- `docs/patterns/entity-slice-pattern.md`: reference pattern for new slices

## Current Entity Status

- Implemented: `projects`, `books`, `chapters`, `scenes`, `characters`, `relationships`, `factions`, `cultures`, `religions`, `governments`, `organizations`, `plot_threads`, `outlines`, `glossary_terms`, `eras`, `themes`, `languages`, `species`, `items`, `technologies`, `locations`, `timeline_events`, `notes`, `retcons`, `attachments`, `ai_sessions`
- Implemented supporting systems: `auth`, `dev setup`, `timeline`
- Seeded for future development, but not yet implemented as slices: none in the current roadmap
