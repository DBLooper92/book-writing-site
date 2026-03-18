# Firestore Structure

## Required Shape

All story-bible data is scoped by user and then by project:

- `users/{uid}`
- `users/{uid}/projects/{projectId}`
- `users/{uid}/projects/{projectId}/{entityCollection}/{entityId}`

This is the core Firestore rule for the repo.

## User Document

`users/{uid}` currently holds account-scoped metadata such as:

- `id`
- `email`
- `displayName`
- `role`
- `plan`
- `status`
- `activeProjectId`
- timestamps such as `createdAt`, `updatedAt`, `lastLoginAt`

The most important field for app behavior right now is `activeProjectId`. It determines which project-scoped entity collections the UI reads from.

## Project Document

`users/{uid}/projects/{projectId}` is the root document for a single story-bible workspace. Current project docs include fields such as:

- `id`
- `ownerId`
- `title`
- `slug`
- `summary`
- `description`
- status and writing metadata
- project-level settings

Future project-level configuration should stay here unless it clearly belongs to a nested collection.

## Entity Collections

Story-bible entities belong inside the active project, for example:

- `users/{uid}/projects/{projectId}/characters/{characterId}`
- `users/{uid}/projects/{projectId}/locations/{locationId}`
- `users/{uid}/projects/{projectId}/timeline_events/{eventId}`

This pattern should continue for every future slice.

## Why Global Entity Collections Are Wrong Here

Do not model entities like:

- `characters/{characterId}`
- `locations/{locationId}`
- `timeline_events/{eventId}`

Reasons:

- the product is organized around user-owned projects
- entity identity is only meaningful inside a project scope
- active project switching depends on project-scoped collection reads
- future multi-project support becomes harder if entities are global
- seed data, hooks, and UI assumptions already depend on nested paths

## Active Project Flow

The current flow is:

1. auth resolves the current user
2. the app reads `users/{uid}`
3. `activeProjectId` is loaded
4. pages subscribe to nested collections under that project

If there is no active project, slice pages should stop and show a no-active-project state.

## Future Entity Guidance

When adding a new entity collection:

1. nest it under `users/{uid}/projects/{projectId}`
2. keep the collection name stable and plural
3. normalize documents into a canonical TypeScript type
4. ensure seed data, hooks, and routes all assume project scope

## Related Docs

- `system-architecture.md`
- `current-status.md`
- `../patterns/firestore-patterns.md`
