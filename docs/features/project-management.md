# Project Management

## Status

Implemented now.

## What Exists

- project listing under `users/{uid}/projects`
- active project observation
- active project switching from the header dropdown and projects page without navigating away from the current route
- project creation from a dedicated `/projects/new` screen
- project rename
- active project stored on `users/{uid}.activeProjectId`
- compact header project control that shows `Project` until an active project exists, then shows the active project title
- header project menu option that opens the project create screen

## Important Rules

- all entity slice reads should assume the active project is the current data scope
- no active project means slice pages should stop and show a helpful state
- project creation should also ensure the user document exists
- project IDs are readable slug-style IDs with numeric suffixes on collision

## What Remains Later

- project deletion or archiving flow
- richer project settings UI
- project duplication or export workflows

