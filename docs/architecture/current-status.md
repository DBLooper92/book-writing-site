# Current Status

This file describes the codebase as it exists now. It should stay honest even when the long-term vision is much larger.

## Implemented Now

### Platform And App Shell

- Next.js App Router application shell
- Tailwind-based UI styling
- top navigation with project selector
- home, auth, Firebase test, and developer setup routes

### Auth

- Firebase Auth client integration
- email/password sign-up
- email/password sign-in
- sign-out flow
- auth state hook

### Project Management

- user project listing under `users/{uid}/projects`
- project creation
- project rename
- active project switching
- `activeProjectId` stored on `users/{uid}`

### Dev Setup

- deterministic initializer at `app/dev/setup`
- default project seeding under `users/{uid}/projects/default-story-bible`
- starter documents for many planned collections
- rerunnable merge/skip behavior for seed data

### Books

- canonical type definitions
- Firestore read and write utilities
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Chapters

- canonical type definitions
- Firestore read and write utilities
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Scenes

- canonical type definitions
- Firestore read and write utilities
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Timeline Events

- canonical type definitions
- Firestore read and write utilities
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Characters

- canonical type definitions
- Firestore read and write utilities
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Relationships

- canonical type definitions
- Firestore read and write utilities
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Factions

- canonical type definitions
- Firestore read and write utilities
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Cultures

- canonical type definitions
- Firestore read and write utilities
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Eras

- canonical type definitions
- Firestore read and write utilities
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Themes

- canonical type definitions
- Firestore read and write utilities
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Languages

- canonical type definitions
- Firestore read and write utilities
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Species

- canonical type definitions
- Firestore read and write utilities
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Items

- canonical type definitions
- Firestore read and write utilities
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Locations

- canonical type definitions
- Firestore read and write utilities
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Notes

- canonical type definitions
- Firestore read and write utilities
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

## Partially Implemented

### CRUD Coverage

Books, Chapters, Scenes, Timeline Events, Characters, Relationships, Factions, Cultures, Eras, Themes, Languages, Species, Items, Locations, and Notes have create, list, detail, and edit flows. Dedicated delete actions are not implemented yet.

### Broader Schema Visibility

The dev initializer seeds many future collections, so Firestore structure is visible now, but most of those entity slices do not yet have real hooks, pages, or forms.

### Cross-Entity Linking

Canonical types already reserve many relationship fields, but most actual linked navigation, validation, and entity pickers are still future work.

## Placeholder Routes

- `app/timeline/page.tsx`

This route communicates product direction and seeded-data intent, but it is not a working feature slice yet.

## Planned Later

- plot threads
- retcons
- technologies
- religions
- governments
- organizations
- outlines
- glossary terms
- attachments
- AI session tracking
- richer AI writing workflows

## Documentation Rule

When updating docs or code, mark a feature as implemented only when it has real route-level and data-layer behavior in the repo. Seeded collections and placeholder pages do not count as implemented slices.
