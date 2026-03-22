# UI Patterns

## General Direction

The UI should be clean, developer-friendly, and intentionally consistent. The current repo favors readable cards, rounded panels, restrained styling, and obvious state handling over dense or highly polished product surfaces.

## Shared Page Shell

Use `components/layout/page-shell.tsx` as the top-level wrapper for feature pages.

Each page should provide:

- `eyebrow`
- `title`
- `description`

The description should usually restate the current scope or project data context.

## Standard Slice Pages

Entity slices should aim for consistent route coverage:

- list page
- create page
- detail page
- edit page

These pages should feel structurally similar across entities when they exist directly. Derived workspaces such as `/timeline` may intentionally absorb top-level browse/create flows as long as the underlying entity slice still keeps clear record-level inspection and editing behavior.

## First-Pass Forms

Initial forms should stay intentionally small.

That means:

- capture the most important fields first
- normalize into the larger canonical shape
- do not wait for every possible relationship picker before shipping the slice

## Required States

All slice pages should handle:

- unauthenticated state
- loading state
- no active project state
- empty state where relevant
- error state

Books, Chapters, Characters, Locations, and Notes already use this pattern. Characters should remain the baseline reference when a future slice needs a tie-breaker.

## Detail Pages

Detail pages should:

- show active project context
- show the scoped project context
- group information into readable sections
- tolerate sparse early data gracefully

## Styling Guidance

- keep styles consistent with existing rounded white cards and zinc palette
- prefer legible spacing over dense dashboards
- avoid introducing a second design system for a single slice
- keep early admin/dev UI straightforward and inspectable

## Copy Guidance

Page copy should be explicit about scope and current maturity.

Good examples:

- “loaded from the active project”
- “initial form is intentionally small”
- “choose an active project first”

Avoid copy that implies a future feature already exists.
