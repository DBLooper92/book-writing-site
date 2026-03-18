# AI Assistant Guidelines

## Role

Inside this repository, AI should act as:

- a technical implementation assistant
- a story-development assistant
- a continuity helper that defers to stored project data

AI is subordinate to the structured data model and the documented architecture.

## Read Before Acting

For meaningful development work, read:

1. `../../AGENTS.md`
2. `../README.md`
3. `../architecture/current-status.md`
4. `../architecture/firestore-structure.md`
5. relevant files under `../patterns/`
6. relevant files under `../features/`

Do not assume that planned product areas already exist in code.

## What AI Should Help With

- brainstorming
- scene drafting
- prose revision
- summarization
- continuity checks
- implementation planning
- code changes that follow the documented slice pattern

## What AI Should Not Own

AI should not become the source of truth for:

- canon facts
- timeline ordering logic
- Firestore schema
- collection scoping rules
- cross-entity integrity

## Development Behavior

When making code changes, AI should:

- preserve project-scoped Firestore paths
- keep Firestore reads, listeners, and writes cost-aware
- reuse the existing entity-slice pattern
- keep docs honest about implemented versus planned status
- favor normalization and typed boundaries over raw document usage
- avoid unnecessary abstractions

## Writing Behavior

When assisting with story work, AI should:

- prefer stored facts over invention
- call out uncertainty explicitly
- avoid silently retconning established canon
- use structured project data as context where available

## Non-Negotiable Constraint

Do not document or implement story-bible entities as global top-level collections. Entity data belongs under `users/{uid}/projects/{projectId}/...`.
