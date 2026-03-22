# Current Status

This file describes the codebase as it exists now. It should stay honest even when the long-term vision is much larger.

## Implemented Now

### Platform And App Shell

- Next.js App Router application shell
- Tailwind-based UI styling
- compact fixed header with Timeline, +Create, and Project controls aligned top-right
- header hide-on-scroll-down and reveal-on-scroll-up behavior
- home, auth, auth verification, backend test, and developer setup routes
- Supabase browser/server clients, Next proxy session refresh, SQL migrations for `profiles`, `projects`, and the current story-bible entity tables, plus a simple non-realtime data layer for the active runtime

### Auth

- Supabase Auth client integration
- email/password sign-up
- email/password sign-in
- signup redirect to a dedicated "verify your email" screen plus a dedicated post-verification confirmation screen
- sign-out flow
- auth state hook
- normalized app-auth user mapping wired into the active routes

### Project Management

- user project listing through Supabase `projects`
- project creation from a dedicated `/projects/new` page
- project rename
- active project switching from the Projects page and header dropdown without route changes
- `activeProjectId` stored on the current Supabase-backed profile row
- simple fetch/refetch-oriented project data layer with client-side refresh triggers instead of realtime listeners

### Dev Setup

- deterministic initializer at `app/dev/setup`
- default project seeding for the authenticated profile and `default-story-bible`
- starter documents for many planned collections
- rerunnable merge/skip behavior for seed data

### Books

- canonical type definitions
- Supabase fetch/refetch read and write utilities for the active runtime path
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Chapters

- canonical type definitions
- Supabase fetch/refetch read and write utilities for the active runtime path
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Scenes

- canonical type definitions
- Supabase fetch/refetch read and write utilities for the active runtime path
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Timeline Events

- canonical type definitions
- Supabase fetch/refetch read and write utilities for the active runtime path
- list and detail hooks
- detail page
- edit page
- legacy `/timeline-events` index and new routes that redirect into `/timeline`
- reusable form and detail-section components
- chronology fields for year, optional month/day boundaries, same-date sequence ordering, and optional time labels
- validation for impossible date ranges, invalid month/day precision, and legacy hidden continuity-field self-reference or overlap rejection
- picker-style linked-slice editing for books, chapters, scenes, characters, locations, eras, and several worldbuilding slices
- shared reference lookups that resolve linked IDs into labels and warnings across the form, detail page, and workspace
- strict chronology ordering for dated events using year/month/day precision and same-date sequence values
- hidden insertion-hint continuity IDs still preserved for undated notch-created placement and backwards compatibility, but no longer drive dated event ordering or appear in the main event editor

### Timeline Workspace

- working `/timeline` route built on `timeline_events` as the sole top-level timeline surface
- shared chronology utilities for sorting, filtering, grouping, and formatting normalized timeline records
- timeline workspace hook for active-project chronology browsing
- split-pane workspace layout with a floating quick-map rail and a dedicated chronology pane on large screens
- center-line visual chronology with alternating event blocks
- derived numeric block markers that renumber from the current sorted chronology
- sticky quick-map rail with embedded visible-event and chronology-range stats plus jump-to-block behavior
- derived insertion notches before, between, and after event blocks
- compressed time-jump markers for large year gaps without proportional blank spacing
- filters for search, status, event type, dating coverage, and link scope, plus pin/unpin behavior for the chronology-pane filter bar
- chronology sorting that uses date fields for dated events, preserves insertion-hint ordering only for undated event groups, and uses same-date sequence ordering for tied dated placements
- validation warnings for invalid date ranges and missing linked slice records
- query-driven timeline create entry points that can prefill shared-year context inside `/timeline`
- inline timeline composer sheet for create-from-notch and edit-in-place flows inside `/timeline`
- nested inline-create lightboxes from the timeline event editor so linked books, chapters, scenes, characters, locations, eras, themes, plot threads, technologies, religions, cultures, and factions can be created without leaving the workspace sheet
- nested linked-record detail lightboxes from timeline event linked chips so authors can inspect referenced slice records without leaving the timeline overlay stack
- in-place event detail lightbox from timeline cards
- first-event creation inside `/timeline` even when the active project has no existing timeline records

### Characters

- canonical type definitions
- Supabase fetch/refetch read and write utilities for the active runtime path
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Relationships

- canonical type definitions
- Supabase fetch/refetch read and write utilities for the active runtime path
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Factions

- canonical type definitions
- Supabase fetch/refetch read and write utilities for the active runtime path
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Cultures

- canonical type definitions
- Supabase fetch/refetch read and write utilities for the active runtime path
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Religions

- canonical type definitions
- Supabase fetch/refetch read and write utilities for the active runtime path
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Governments

- canonical type definitions
- Supabase fetch/refetch read and write utilities for the active runtime path
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Organizations

- canonical type definitions
- Supabase fetch/refetch read and write utilities for the active runtime path
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Plot Threads

- canonical type definitions
- Supabase fetch/refetch read and write utilities for the active runtime path
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Outlines

- canonical type definitions
- Supabase fetch/refetch read and write utilities for the active runtime path
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Glossary Terms

- canonical type definitions
- Supabase fetch/refetch read and write utilities for the active runtime path
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Eras

- canonical type definitions
- Supabase fetch/refetch read and write utilities for the active runtime path
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Themes

- canonical type definitions
- Supabase fetch/refetch read and write utilities for the active runtime path
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Languages

- canonical type definitions
- Supabase fetch/refetch read and write utilities for the active runtime path
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Species

- canonical type definitions
- Supabase fetch/refetch read and write utilities for the active runtime path
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Items

- canonical type definitions
- Supabase fetch/refetch read and write utilities for the active runtime path
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Technologies

- canonical type definitions
- Supabase fetch/refetch read and write utilities for the active runtime path
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Locations

- canonical type definitions
- Supabase fetch/refetch read and write utilities for the active runtime path
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Notes

- canonical type definitions
- Supabase fetch/refetch read and write utilities for the active runtime path
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Retcons

- canonical type definitions
- Supabase fetch/refetch read and write utilities for the active runtime path
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### Attachments

- canonical type definitions
- Supabase fetch/refetch read and write utilities for the active runtime path
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

### AI Sessions

- canonical type definitions
- Supabase fetch/refetch read and write utilities for the active runtime path
- list and detail hooks
- list page
- create page
- detail page
- edit page
- reusable form, card, and detail-section components

## Partially Implemented

### Runtime Verification

The active app runtime now uses Supabase Auth, Supabase-backed profiles/projects, and Supabase-backed data modules across the full story-bible surface. The repo contains Supabase client setup, proxy-based session refresh, SQL schema for `profiles`, `projects`, and the current entity collections, plus simple fetch/refetch data helpers. Live smoke testing against the configured Supabase project is still the main follow-up task.

### CRUD Coverage

Books, Chapters, Scenes, Characters, Relationships, Factions, Cultures, Religions, Governments, Organizations, Plot Threads, Outlines, Glossary Terms, Eras, Themes, Languages, Species, Items, Technologies, Locations, Notes, Retcons, Attachments, and AI Sessions have create, list, detail, and edit flows. Timeline Events keeps dedicated detail and edit routes plus workspace-driven browse/create flows under `/timeline`. Dedicated delete actions are not implemented yet.

### Workflow Depth

Attachments and AI Sessions now have real slices, but both stay intentionally metadata-first in their initial pass. Upload/storage workflow, provider integration, and richer operational tooling are still future work.

### Cross-Entity Linking

Canonical types already reserve many relationship fields, and Timeline Events now has first-pass picker-style linking plus shared linked-ID validation for the main connected slices, but broader cross-slice validation and richer linked editing are still future work.

### Timeline Logic Depth

The `/timeline` workspace now exists as the sole route-level visual chronology surface and timeline events now support linked-slice pickers, inline workspace authoring, shared linked-ID validation, and year/month/day chronology precision with same-date ordering. Dated events now sort strictly from chronology fields, while undated notch-created events can still preserve relative insertion order through hidden legacy continuity IDs. Richer calendar systems, true timestamps, and more advanced chronology tooling are still future work.

## Planned Later

- upload and storage workflow for attachments
- richer AI writing workflows

## Documentation Rule

When updating docs or code, mark a feature as implemented only when it has real route-level and data-layer behavior in the repo. Seeded collections and placeholder pages do not count as implemented slices.

