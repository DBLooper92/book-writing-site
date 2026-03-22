# Documentation

This folder is the durable project guidance system for BookWritingSite. It is meant to keep future implementation work aligned with both the long-term product vision and the current state of the repo.

## Recommended Read Order

For any substantial task, read in this order:

1. `../AGENTS.md`
2. `product/project-vision.md`
3. `architecture/current-status.md`
4. `architecture/decision-log.md`
5. `architecture/next-steps.md`
6. `architecture/firestore-structure.md`
7. `architecture/system-architecture.md`
8. relevant files under `patterns/`
9. relevant files under `features/`
10. relevant files under `reference/` and `prompts/`

## Sections

### Product

- `product/project-vision.md`: long-term product intent, user workflow, and scope boundaries

### Architecture

- `architecture/system-architecture.md`: high-level app structure and architectural rules
- `architecture/firestore-structure.md`: original Firestore path model and the scoping constraints that still inform the Supabase schema
- `architecture/current-status.md`: implemented now vs partial vs planned
- `architecture/decision-log.md`: durable architectural and product-direction decisions
- `architecture/next-steps.md`: short-term development direction grounded in the current repo

### Patterns

- `patterns/entity-slice-pattern.md`: reusable slice architecture modeled on Characters
- `patterns/firestore-patterns.md`: data-access rules carried forward from the Firestore era, including IDs, timestamps, merge behavior, and seed compatibility
- `patterns/ui-patterns.md`: page and form consistency rules
- `patterns/typing-and-normalization.md`: types, normalization layers, and form/value boundaries

### Features

- `features/books.md`
- `features/chapters.md`
- `features/scenes.md`
- `features/timeline.md`
- `features/timeline-events.md`
- `features/characters.md`
- `features/relationships.md`
- `features/factions.md`
- `features/cultures.md`
- `features/governments.md`
- `features/organizations.md`
- `features/plot-threads.md`
- `features/outlines.md`
- `features/glossary-terms.md`
- `features/religions.md`
- `features/eras.md`
- `features/themes.md`
- `features/languages.md`
- `features/species.md`
- `features/items.md`
- `features/technologies.md`
- `features/locations.md`
- `features/notes.md`
- `features/retcons.md`
- `features/attachments.md`
- `features/ai-sessions.md`
- `features/project-management.md`
- `features/dev-setup.md`

### Reference

- `reference/entity-roadmap.md`
- `reference/naming-conventions.md`
- `reference/seed-data-policy.md`

### Prompts

- `prompts/entity-slice-task-template.md`
- `prompts/cleanup-pass-template.md`

## Current Reality

Implemented now:

- auth
- project management
- active project switching
- dev seeding
- books slice
- chapters slice
- scenes slice
- timeline events slice
- timeline workspace with a visual center-line chronology
- characters slice
- relationships slice
- factions slice
- cultures slice
- governments slice
- organizations slice
- plot threads slice
- outlines slice
- glossary terms slice
- religions slice
- eras slice
- themes slice
- languages slice
- species slice
- items slice
- technologies slice
- locations slice
- notes slice
- retcons slice
- attachments slice
- AI sessions slice

Partial or planned:

- deeper timeline continuity editing and validation are still planned
- richer attachment upload workflow and richer AI tooling are still planned
