# Documentation

This folder is the durable project guidance system for BookWritingSite. It is meant to keep future implementation work aligned with both the long-term product vision and the current state of the repo.

## Recommended Read Order

For any substantial task, read in this order:

1. `../AGENTS.md`
2. `product/project-vision.md`
3. `architecture/current-status.md`
4. `architecture/decision-log.md`
5. `architecture/next-steps.md`
6. `architecture/brain-dump-implementation-plan.md` when the task is about the next AI brain-dump pass
7. `architecture/manuscript-import-implementation-plan.md` when the task is about manuscript import follow-up work
8. `architecture/project-scope-model.md`
9. `architecture/system-architecture.md`
9. relevant files under `patterns/`
10. relevant files under `features/`
11. relevant files under `reference/` and `prompts/`

## Sections

### Product

- `product/project-vision.md`: long-term product intent, user workflow, and scope boundaries

### Architecture

- `architecture/system-architecture.md`: high-level app structure and architectural rules
- `architecture/project-scope-model.md`: current Supabase scoping model for users, projects, and entity rows
- `architecture/current-status.md`: implemented now vs partial vs planned
- `architecture/decision-log.md`: durable architectural and product-direction decisions
- `architecture/next-steps.md`: short-term development direction grounded in the current repo
- `architecture/brain-dump-implementation-plan.md`: ordered execution plan for the next staged brain-dump workflow pass
- `architecture/manuscript-import-implementation-plan.md`: ordered follow-up plan for the first-pass manuscript import workflow

### Patterns

- `patterns/entity-slice-pattern.md`: reusable slice architecture modeled on Characters
- `patterns/scoping-and-data-patterns.md`: current scoping, write, normalization, and cost rules for the Supabase runtime
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
- attachment-backed image uploads on entity detail pages
- AI sessions slice

Partial or planned:

- deeper timeline continuity editing and validation are still planned
- broader non-image attachment workflows and richer AI tooling beyond the first brain-dump extraction pass are still planned
