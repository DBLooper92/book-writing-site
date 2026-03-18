# System Architecture

## Architectural Goal

The app should support a personal story-bible system that remains structured, navigable, and cheap to evolve. The architecture should privilege clarity over abstraction and future-proofing over premature complexity.

## Core Separation

The central design boundary is:

- Firestore stores structured project data and canon-adjacent metadata.
- UI code reads normalized records and presents editing or wiki-style views.
- AI assists with language tasks and analysis, but does not define schema or application truth.

## Current Technical Stack

- Next.js App Router for route structure and client pages
- TypeScript for shared types and predictable refactors
- Firebase Auth for user identity
- Firestore for user, project, and entity data
- Tailwind CSS for UI styling

## Application Layers

### Types

`types/` defines canonical entity shapes, form values, normalization helpers, and controlled option sets.

### Firestore Access

`lib/firebase/` owns reads, writes, path construction, ID generation, and document normalization.

### Hooks

`hooks/` turns auth state, active project state, list subscriptions, and detail subscriptions into UI-friendly state.

### UI Components

`components/` contains shared layout primitives plus slice-specific cards, forms, and detail sections.

### Routes

`app/` contains pages for list, create, detail, edit, setup, auth, and placeholder workspaces.

## Current Architectural Pattern

The repo currently follows an entity-slice approach:

- one canonical type module per entity
- one Firestore utility module per entity collection
- one list hook and one detail hook per entity
- one list page, create page, detail page, and edit page per entity
- one reusable form component per entity

Characters is the reference slice. Locations confirms the pattern is reusable.
Notes shows that the same slice architecture also works for text-heavy project records.
Books extends it into manuscript structure without changing the core architecture.

## Design Rules

1. Keep data scoped by user and project.
2. Keep schema explicit and field-based.
3. Normalize Firestore data before rendering.
4. Keep forms intentionally smaller than the full canonical document when that improves velocity.
5. Preserve compatibility between seeded docs and user-created docs.
6. Prefer additive, modular feature growth over framework-heavy indirection.
7. Keep Firestore usage cost-aware: choose the cheapest query, listener, and write pattern that still provides a clean authoring experience.

## Current Scope Boundary

Implemented now:

- auth
- projects
- active project switching
- books
- characters
- locations
- notes
- dev setup and seeding

Not yet implemented as full features:

- timeline tools
- chapter writing tools
- broader entity library
- AI writing surfaces

## Related Docs

- `firestore-structure.md`
- `current-status.md`
- `../patterns/entity-slice-pattern.md`
- `../patterns/firestore-patterns.md`
- `../patterns/typing-and-normalization.md`
- `../patterns/ui-patterns.md`
