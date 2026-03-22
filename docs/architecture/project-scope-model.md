# Project Scope Model

This file defines the active runtime ownership model. The app is Supabase-only and every project record must remain scoped by both user and project.

## Current Scope Rules

- `profiles.id` identifies the signed-in user
- `profiles.active_project_id` stores the active project pointer for that user
- `projects` rows are owned through `projects.user_id`
- every story-bible entity row carries `user_id`, `project_id`, and readable `id`

The app does not use global story-bible entity rows.

## What Counts As A Valid Scoped Record

Project-level ownership is valid when:

- the user exists on `profiles`
- the project exists on `projects`
- the project row is owned by that same user
- every entity row repeats the same `user_id` and `project_id`

Examples:

- `projects(user_id, id)`
- `books(user_id, project_id, id)`
- `characters(user_id, project_id, id)`
- `timeline_events(user_id, project_id, id)`

## Why Global Entity Rows Are Wrong Here

Do not model entities like:

- `characters(id)` without `user_id` and `project_id`
- `locations(id)` without `user_id` and `project_id`
- `timeline_events(id)` without `user_id` and `project_id`

Reasons:

- the product is organized around user-owned projects
- entity identity is only meaningful inside a project scope
- active project switching depends on project-scoped reads
- future multi-project support stays simpler when scope is explicit on every row
- seed data, hooks, and routes already assume explicit user and project scope

## Active Project Flow

The current flow is:

1. auth resolves the current user
2. the app reads that user's `profiles` row
3. `active_project_id` is loaded
4. pages query scoped entity tables using that `user_id` and `project_id`

If there is no active project, slice pages should stop and show a no-active-project state.

## Future Slice Guidance

When adding a new entity table:

1. keep the table name stable and plural
2. require `user_id`, `project_id`, and readable `id`
3. normalize rows into a canonical TypeScript type before they reach the UI
4. keep seed rows, hooks, and routes aligned to the same scope rule

## Related Docs

- `system-architecture.md`
- `current-status.md`
- `../patterns/scoping-and-data-patterns.md`
