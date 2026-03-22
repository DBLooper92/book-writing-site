# Firestore Structure

This file is historical context. The active runtime is Supabase-only, but the original Firestore nesting rule explains why every runtime row still carries both user and project scope.

## Historical Shape

All story-bible data is scoped by user and then by project:

- `users/{uid}`
- `users/{uid}/projects/{projectId}`
- `users/{uid}/projects/{projectId}/{entityCollection}/{entityId}`

This was the core Firestore rule for the repo.

## Current Supabase Equivalent

The active runtime keeps the same ownership model through relational scope columns:

- `profiles.id` identifies the signed-in user
- `projects.user_id` and `projects.id` scope each project
- every entity row carries `user_id`, `project_id`, and readable `id`

The old nested path model now maps conceptually to:

- `profiles`
- `projects`
- entity tables such as `books`, `characters`, and `timeline_events`

## Historical User Document

`users/{uid}` currently holds account-scoped metadata such as:

- `id`
- `email`
- `displayName`
- `role`
- `plan`
- `status`
- `activeProjectId`
- timestamps such as `createdAt`, `updatedAt`, `lastLoginAt`

The same concept now lives on `profiles.active_project_id`, which determines which project-scoped rows the UI reads.

## Historical Project Document

`users/{uid}/projects/{projectId}` is the root document for a single story-bible workspace. Current project docs include fields such as:

- `id`
- `ownerId`
- `title`
- `slug`
- `summary`
- `description`
- status and writing metadata
- project-level settings

The same project-level configuration now belongs on the scoped `projects` row unless it clearly belongs to an entity table.

## Historical Entity Collections

Story-bible entities belong inside the active project, for example:

- `users/{uid}/projects/{projectId}/characters/{characterId}`
- `users/{uid}/projects/{projectId}/locations/{locationId}`
- `users/{uid}/projects/{projectId}/timeline_events/{eventId}`

The equivalent rule now is that every future slice row must include `user_id`, `project_id`, and readable `id`.

## Why Global Entity Collections Are Wrong Here

Do not model entities like:

- `characters/{characterId}`
- `locations/{locationId}`
- `timeline_events/{eventId}`

Reasons:

- the product is organized around user-owned projects
- entity identity is only meaningful inside a project scope
- active project switching depends on project-scoped reads
- future multi-project support becomes harder if entities are global
- seed data, hooks, and UI assumptions already depend on nested paths

## Current Active Project Flow

The current flow is:

1. auth resolves the current user
2. the app reads `profiles`
3. `active_project_id` is loaded
4. pages query scoped entity tables under that active project

If there is no active project, slice pages should stop and show a no-active-project state.

## Future Entity Guidance

When adding a new entity collection:

1. keep the table name stable and plural
2. require `user_id`, `project_id`, and readable `id`
3. normalize rows into a canonical TypeScript type
4. ensure seed data, hooks, and routes all assume project scope

## Related Docs

- `system-architecture.md`
- `current-status.md`
- `../patterns/firestore-patterns.md`
