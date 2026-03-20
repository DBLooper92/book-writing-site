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

### Timeline Workspace

- working `/timeline` route built on `timeline_events`
- shared chronology utilities for sorting, filtering, grouping, and formatting normalized timeline records
- timeline workspace hook for active-project chronology browsing
- grouped dated chronology browsing plus a dedicated undated section
- filters for search, status, event type, dating coverage, and link scope
- direct linked navigation to existing slice detail routes from timeline records

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

### Religions

- canonical type definitions
- Firestore read and write utilities
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Governments

- canonical type definitions
- Firestore read and write utilities
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Organizations

- canonical type definitions
- Firestore read and write utilities
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Plot Threads

- canonical type definitions
- Firestore read and write utilities
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Outlines

- canonical type definitions
- Firestore read and write utilities
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Glossary Terms

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

### Technologies

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

### Retcons

- canonical type definitions
- Firestore read and write utilities
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Attachments

- canonical type definitions
- Firestore read and write utilities
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### AI Sessions

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

Books, Chapters, Scenes, Timeline Events, Characters, Relationships, Factions, Cultures, Religions, Governments, Organizations, Plot Threads, Outlines, Glossary Terms, Eras, Themes, Languages, Species, Items, Technologies, Locations, Notes, Retcons, Attachments, and AI Sessions have create, list, detail, and edit flows. Dedicated delete actions are not implemented yet.

### Workflow Depth

Attachments and AI Sessions now have real slices, but both stay intentionally metadata-first in their initial pass. Upload/storage workflow, provider integration, and richer operational tooling are still future work.

### Cross-Entity Linking

Canonical types already reserve many relationship fields, but most actual linked navigation, validation, and entity pickers are still future work.

### Timeline Logic Depth

The `/timeline` workspace now exists as a real route-level feature, but predecessor/successor editing, richer chronology validation, and more detailed date models are still future work.

## Planned Later

- upload and storage workflow for attachments
- richer AI writing workflows

## Documentation Rule

When updating docs or code, mark a feature as implemented only when it has real route-level and data-layer behavior in the repo. Seeded collections and placeholder pages do not count as implemented slices.
