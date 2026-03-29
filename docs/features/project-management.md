# Project Management

## Status

Implemented now.

## What Exists

- project listing through the Supabase `projects` table
- active project observation
- active project switching from the header dropdown and projects page without navigating away from the current route
- project creation from a dedicated `/projects/new` screen
- project rename
- active project stored on `profiles.active_project_id`
- compact header project control that shows `Project` until an active project exists, then shows the active project title
- header project menu option that opens the project create screen
- header profile icon with a small account menu that can open the profile lightbox or log the user out

## Important Rules

- all entity slice reads should assume the active project is the current data scope
- no active project means slice pages should stop and show a helpful state
- project creation should also ensure the profile row exists
- project IDs are readable slug-style IDs with numeric suffixes on collision

## What Remains Later

- project deletion or archiving flow
- richer project settings UI
- project duplication or export workflows


