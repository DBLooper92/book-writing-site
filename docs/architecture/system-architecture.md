# System Architecture

## Architectural Goal

The app should support a personal story-bible system that remains structured, navigable, and cheap to evolve. The architecture should privilege clarity over abstraction and future-proofing over premature complexity.

## Core Separation

The central design boundary is:

- Supabase Postgres stores structured project data and canon-adjacent metadata.
- UI code reads normalized records and presents editing or wiki-style views.
- AI assists with language tasks and analysis, but does not define schema or application truth.

## Current Technical Stack

- Next.js App Router for route structure and client pages
- TypeScript for shared types and predictable refactors
- Supabase Auth for user identity
- Supabase Postgres for user, project, and entity data
- Tailwind CSS for UI styling

## Application Layers

### Types

`types/` defines canonical entity shapes, form values, normalization helpers, and controlled option sets.

### Data Access

`lib/data/` owns reads, writes, readable ID generation, and normalization into the app's canonical types. `lib/supabase/` owns client setup, session refresh helpers, health checks, and developer seeding.

### Hooks

`hooks/` turns auth state, active project state, list fetches, and detail fetches into UI-friendly state.

### UI Components

`components/` contains shared layout primitives plus slice-specific cards, forms, detail sections, and derived workspace UI such as the first-pass Timeline workspace.

### Routes

`app/` contains pages for list, create, detail, edit, setup, auth, and derived workspaces.

## Current Architectural Pattern

The repo currently follows an entity-slice approach:

- one canonical type module per entity
- one simple data module per entity collection
- one list hook and one detail hook per entity
- one consistent top-level browse/create flow plus detail/edit support per entity, usually via list/create/detail/edit pages unless a derived workspace is the stronger surface
- one reusable form component per entity

Characters is the reference slice. Locations confirms the pattern is reusable.
Notes shows that the same slice architecture also works for text-heavy project records.
Books extends it into manuscript structure without changing the core architecture.
Chapters confirms that the same pattern also works for child manuscript records.
Scenes extends the same pattern one level deeper into scene planning and drafting.
Timeline Events extends the same pattern into chronology without introducing a separate timeline architecture.
Relationships extends the same pattern into cross-entity connection records without changing the project-scoped data model.
Factions, Cultures, Species, and Items extend the same pattern into deeper worldbuilding records without changing the project-scoped data model.

## Design Rules

1. Keep data scoped by user and project.
2. Keep schema explicit and field-based.
3. Normalize backend rows before rendering.
4. Keep forms intentionally smaller than the full canonical document when that improves velocity.
5. Preserve compatibility between seeded docs and user-created docs.
6. Prefer additive, modular feature growth over framework-heavy indirection.
7. Keep data access cost-aware: choose the cheapest query and write pattern that still provides a clean authoring experience.

## Current Scope Boundary

Implemented now:

- auth
- projects
- active project switching
- dev setup and seeding
- books
- chapters
- scenes
- timeline events
- timeline workspace
- characters
- relationships
- factions
- cultures
- religions
- governments
- organizations
- plot threads
- outlines
- glossary terms
- eras
- themes
- languages
- species
- items
- technologies
- locations
- notes
- retcons
- attachments
- AI sessions

Not yet implemented as full features:

- richer cross-entity navigation and validation
- deeper timeline continuity tooling
- broader non-image attachment upload workflow
- AI writing surfaces

## Related Docs

- `project-scope-model.md`
- `current-status.md`
- `../patterns/entity-slice-pattern.md`
- `../patterns/scoping-and-data-patterns.md`
- `../patterns/typing-and-normalization.md`
- `../patterns/ui-patterns.md`
