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
- `architecture/firestore-structure.md`: Firestore path model, active project handling, and scoping constraints
- `architecture/current-status.md`: implemented now vs partial vs planned
- `architecture/decision-log.md`: durable architectural and product-direction decisions
- `architecture/next-steps.md`: short-term development direction grounded in the current repo

### Patterns

- `patterns/entity-slice-pattern.md`: reusable slice architecture modeled on Characters
- `patterns/firestore-patterns.md`: document path rules, IDs, timestamps, merge behavior, and seed compatibility
- `patterns/ui-patterns.md`: page and form consistency rules
- `patterns/typing-and-normalization.md`: types, normalization layers, and form/value boundaries

### Features

- `features/books.md`
- `features/characters.md`
- `features/locations.md`
- `features/notes.md`
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
- characters slice
- locations slice
- notes slice

Partial or planned:

- timeline UI is still a placeholder
- many future collections are visible through seed data only
