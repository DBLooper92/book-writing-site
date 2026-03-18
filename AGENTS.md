# AGENTS.md

## Purpose

BookWritingSite is a private, single-author writing environment for a long-form multi-book series. The product combines:

- a structured story bible
- a worldbuilding database
- wiki-style reference pages
- timeline management
- AI-assisted brainstorming, summarization, editing, and drafting

Structured project data is the source of truth. AI supports language work; it does not replace schema, canon, or timeline logic.

## Stack

- Next.js App Router
- TypeScript
- Firebase Auth
- Firestore
- Tailwind CSS

## Hard Data Rule

Story-bible entity data must stay project-scoped under:

- `users/{uid}`
- `users/{uid}/projects/{projectId}`
- `users/{uid}/projects/{projectId}/{entityCollection}/{entityId}`

Do not introduce global entity collections such as `characters/{characterId}` or `locations/{locationId}`.

## Current Reality

Implemented now:

- auth with email/password
- user-owned projects
- active project switching via `users/{uid}.activeProjectId`
- dev initializer that seeds a default project and starter docs
- books slice with list, create, detail, and edit flows
- chapters slice with list, create, detail, and edit flows
- characters slice with list, create, detail, and edit flows
- locations slice with list, create, detail, and edit flows
- notes slice with list, create, detail, and edit flows

Partial or placeholder:

- timeline route placeholder
- many future entity collections seeded for inspection, but not yet surfaced with real CRUD UIs

## Architectural Rules

1. Keep canon data in Firestore, not in AI chat state.
2. Use canonical TypeScript types in `types/` to define intended entity shape.
3. Normalize raw Firestore documents before they reach UI components.
4. Reuse the existing entity-slice pattern instead of inventing a new architecture per feature.
5. Prefer small, maintainable forms and predictable Firestore writes over heavy abstractions.
6. Be explicit about what is implemented now versus planned later in code and docs.
7. Keep Firestore usage cost-aware: prefer the cheapest read/write pattern that still delivers a smooth, clean user experience.

## How To Approach Future Work

- Read `docs/README.md` first, then the relevant architecture, pattern, and feature docs.
- Treat the Characters slice as the reference implementation pattern.
- Keep list, create, detail, and edit pages consistent across slices.
- Preserve seed compatibility so seeded docs and user-created docs normalize into the same UI shape.
- Be deliberate about Firestore reads, listeners, and writes so the app stays inexpensive to run.
- Do not document aspirational behavior as if it already exists.

## Documentation Maintenance

After any meaningful code change, update stale docs in the same pass when the repo's documented reality changed.

- Refresh `docs/architecture/current-status.md` when implemented, partial, or planned status changes.
- Refresh the relevant file under `docs/features/` when a feature's behavior, scope, or limitations changed.
- Refresh `docs/reference/entity-roadmap.md` when the recommended slice order or near-term priorities changed.
- Append to `docs/architecture/decision-log.md` when a durable architectural or product-direction decision is made.
- Refresh `docs/architecture/next-steps.md` when short-term priorities materially change.
- Update any other doc whose statements became outdated because of the code change.

Docs must stay honest about what is implemented now, what is partial, and what is planned later. Seeded collections, placeholder pages, and intended future behavior do not count as implemented features.

## Read Next

- `README.md`
- `docs/README.md`
- `docs/architecture/firestore-structure.md`
- `docs/architecture/current-status.md`
- `docs/architecture/decision-log.md`
- `docs/architecture/next-steps.md`
- `docs/patterns/entity-slice-pattern.md`
- `docs/patterns/firestore-patterns.md`
- `docs/patterns/typing-and-normalization.md`
- `docs/patterns/ui-patterns.md`
- `docs/features/books.md`
- `docs/features/chapters.md`
- `docs/features/notes.md`
- `docs/ai/assistant-guidelines.md`
