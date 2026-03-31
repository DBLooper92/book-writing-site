# Current Status

This file describes the codebase as it exists now. It should stay honest even when the long-term vision is much larger.

## Implemented Now

### Platform And App Shell

- Next.js App Router application shell
- Tailwind-based UI styling
- compact fixed header with Project Overview, Timeline, +Create, Project, and account controls aligned top-right
- shared slice-page shell that now adds a wiki-like left navigation rail across the entity slices plus the dedicated project-overview screen, with top-level text links routing to project overview or slice create pages and the active entry expanding into project-scoped record links
- profile icon menu in the header with profile-lightbox tabs for details, API keys, password-confirmed project deletion, password-confirmed full account deletion, and logout entry points for authenticated users
- header hide-on-scroll-down and reveal-on-scroll-up behavior
- home, auth, auth verification, backend test, and developer setup routes
- Supabase browser/server clients, Next proxy session refresh, SQL migrations for `profiles`, `projects`, and the current story-bible entity tables, plus a simple non-realtime data layer for the active runtime

### Auth

- Supabase Auth client integration
- email/password sign-up
- email/password sign-in
- signup redirect to a dedicated "verify your email" screen plus a dedicated post-verification confirmation screen
- post-sign-in redirect that sends users without projects to `/projects/new` and otherwise resumes the last remembered in-app route for the active project
- sign-out flow
- password-confirmed full account deletion from the profile security tab, including removal of the Supabase auth user, profile row, projects, scoped records, and uploaded files before redirecting back to sign-up
- auth state hook
- normalized app-auth user mapping wired into the active routes

### Project Management

- user project listing through Supabase `projects`
- project creation from a dedicated `/projects/new` page
- dedicated `/project-overview` page for the active project's summary, writing metadata, chronology defaults, and runtime settings
- project rename
- active project switching from the Projects page and header dropdown without route changes
- password-confirmed project deletion from the profile security tab, including scoped record cascade through the project-owned tables plus uploaded-file cleanup for that project
- `profiles.active_project_id` stored on the current Supabase-backed profile row
- encrypted per-user OpenAI key metadata stored on the current Supabase-backed profile row for AI brain-dump usage
- last usable in-app route remembered client-side and only resumed when it still matches the same user and active project
- simple fetch/refetch-oriented project data layer with client-side refresh triggers instead of realtime listeners

### Dev Setup

- deterministic initializer at `app/dev/setup`
- default project seeding for the authenticated profile and `default-story-bible`
- starter rows for many planned collections
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
- toolbar-level brain-dump lightbox beside the main create button so authors can launch AI extraction without leaving `/timeline`
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
- private `entity-images` Supabase Storage bucket plus scoped storage metadata on `attachments`
- shared image-gallery uploader on linked Books, Chapters, Scenes, Characters, Factions, Cultures, Religions, Governments, Organizations, Plot Threads, Outlines, Glossary Terms, Eras, Themes, Languages, Species, Items, Technologies, Locations, Notes, Retcons, and Timeline Event detail pages
- direct delete action for uploaded entity images from that shared gallery

### AI Sessions

- canonical type definitions
- Supabase fetch/refetch read and write utilities for the active runtime path
- list and detail hooks
- list page
- create page
- dedicated `/ai-sessions/brain-dump` route for long-form text extraction
- authenticated `/api/ai-sessions/brain-dump` server action that calls OpenAI Responses API with structured output and writes back to the scoped `ai_sessions` row
- authenticated `/api/profile/openai-key` server action for saving, masking, and deleting the signed-in user's OpenAI key on the profile row
- detail page
- edit page
- reusable form, card, and detail-section components
- persisted brain-dump source text, author guidance, extraction status, extraction error, extraction model, and structured proposal output on `ai_sessions`
- detail-page rendering for reviewable character, timeline event, chapter outline, and scene proposals generated from brain-dump text
- the brain-dump extraction route now tolerates Responses API structured output arriving through nested response content instead of only top-level `output_text`, and it now surfaces clearer failures when OpenAI stops early before finishing structured JSON
- failed brain-dump submissions now also log structured timeout/provider debug metadata on the server and return on-screen technical details in the form, including the failed `aiSessionId`, response summary, and a truncated raw provider-response preview when one exists
- proposal-level brain-dump review scaffolding persisted on `ai_sessions.extraction_result`, including review status, suggested action, matched-record placeholder data, candidate-match slots, and timeline placement suggestion placeholders
- deterministic cheap matching against existing scoped characters, timeline events, chapters, and scenes during brain-dump completion so new proposals can save candidate matches and `create` versus `update` suggestions without rereading the whole project canon
- same-dump duplicate detection across extracted characters, timeline events, chapter outlines, and scenes so proposals can also save duplicate candidates and conservative `merge` suggestions for author review
- strong cheap-match results now also populate `ai_sessions.linked_entity_ids`, while weaker partial and token-overlap matches are filtered more conservatively to reduce false positives before deeper review
- on-demand targeted context loading for timeline proposals from the AI session detail page, including matched/candidate timeline event summaries, nearby chronology records, and linked character/chapter/scene summaries fetched only when requested
- targeted timeline context now also derives a first-pass placement recommendation and focused continuity warnings from the loaded chronology and linked summaries
- targeted timeline continuity warnings now also compare proposal-linked characters, chapters, and scenes against the matched or candidate anchor event's existing links
- timeline proposals now also support author-editable review controls in the AI session detail page, persisting review status, chosen action, placement, optional start/end years, and optional display date label back onto `ai_sessions.extraction_result`
- reviewed timeline proposals can now apply `create`, `update`, or `merge` decisions into real scoped `timeline_events` rows from the AI session detail page, reusing the existing timeline-event validation and document-building path before marking the proposal applied
- character proposals now also support author-editable review controls in the AI session detail page, persisting review status and chosen action back onto `ai_sessions.extraction_result` before any character canon write happens
- reviewed character proposals can now apply `create`, `update`, or `merge` decisions into real scoped `characters` rows from the AI session detail page, reusing the existing character document-building path and preserving existing linked records conservatively on updates
- character apply now also repairs safe reverse scene and chapter character links, so approved related-scene matches update `scenes.character_ids` and parent `chapters.character_ids` alongside the character row
- on-demand targeted context loading for character proposals from the AI session detail page, including matched/candidate character summaries, linked timeline-event summaries, related-scene summaries, and focused continuity warnings
- chapter proposals now also support author-editable review controls in the AI session detail page, persisting review status and chosen action back onto `ai_sessions.extraction_result` before any chapter canon write happens
- reviewed chapter proposals can now apply `create`, `update`, or `merge` decisions into real scoped `chapters` rows from the AI session detail page, reusing the existing chapter document-building path and preserving matched scene and POV links conservatively on updates
- on-demand targeted context loading for chapter proposals from the AI session detail page, including matched/candidate chapter summaries, point-of-view character context, linked scene summaries, and focused continuity warnings
- scene proposals now also support author-editable review controls in the AI session detail page, persisting review status and chosen action back onto `ai_sessions.extraction_result` before any scene canon write happens
- reviewed scene proposals can now apply `create`, `update`, or `merge` decisions into real scoped `scenes` rows from the AI session detail page, reusing the existing scene document-building path and preserving existing chapter/book linkage conservatively on updates
- on-demand targeted context loading for scene proposals from the AI session detail page, including matched/candidate scene summaries, parent-chapter context, point-of-view character context, linked timeline-event summaries, and focused continuity warnings
- chapter and scene brain-dump apply routes now also repair reverse manuscript links conservatively, syncing matched scene rows back to the applied chapter and syncing applied scenes back into their linked chapter's `scene_ids` when the existing scoped linkage is safe to preserve
- proposal review panels can now explicitly promote a candidate match into the saved `matchedRecord`, so authors can choose the exact existing target before `update` or `merge`
- brain-dump apply routes now reject repeat applies by default, require the proposal to be explicitly saved as `reviewed` before any canon write, and still require a saved `matchedRecord` before any `update` or `merge` write runs
- profile lightbox with Details, API keys, and Security tabs so each user can manage the key used by brain-dump extraction, delete individual projects, or permanently delete the whole account after re-entering the current password

## Partially Implemented

### Runtime Verification

The active app runtime now uses Supabase Auth, Supabase-backed profiles/projects, and Supabase-backed data modules across the full story-bible surface. The repo contains Supabase client setup, proxy-based session refresh, SQL schema for `profiles`, `projects`, and the current entity collections, plus simple fetch/refetch data helpers. Live smoke testing against the configured Supabase project is still the main follow-up task.

### CRUD Coverage

Books, Chapters, Scenes, Characters, Relationships, Factions, Cultures, Religions, Governments, Organizations, Plot Threads, Outlines, Glossary Terms, Eras, Themes, Languages, Species, Items, Technologies, Locations, Notes, Retcons, Attachments, and AI Sessions have create, list, detail, and edit flows. Timeline Events keeps dedicated detail and edit routes plus workspace-driven browse/create flows under `/timeline`. Dedicated slice-level delete actions are still not implemented, but password-confirmed project deletion and full account deletion now exist in the profile security tab.

### Workflow Depth

Attachments now supports private image upload and delete workflow for linked entity detail pages through scoped `attachments` rows plus Supabase Storage, while the standalone manual attachment form remains intentionally metadata-first for broader file-reference use. AI Sessions now goes one step further with a provider-backed brain-dump extraction flow, persisted proposal-review scaffolding, a cheap deterministic matching pass against existing characters, timeline events, chapters, and scenes, same-dump duplicate detection for those extracted proposal groups, session-level linked-record IDs derived from strong cheap matches, on-demand targeted-context endpoints for timeline, character, chapter, and scene proposal review, and explicit author-driven apply paths that can write reviewed timeline, character, chapter, and scene proposals into real scoped canon rows. Timeline context now derives first-pass placement guidance plus continuity warnings grounded in both the loaded summaries and the anchor event's existing linked records, character context now loads matched character-sheet summaries, linked event context, and related-scene continuity warnings, chapter context now loads matched chapter summaries, point-of-view context, and linked scene context, the current chapter/scene apply routes repair safe reverse manuscript links so `chapters.scene_ids` and `scenes.chapter_id` stay aligned more often after author-approved applies, the character apply route now repairs safe reverse scene and chapter character links, and the review/apply layer now lets authors explicitly pick the target match while requiring a saved `reviewed` state before any canon write. Broader contradiction review beyond the current targeted checks, richer search beyond the current candidate lists, broader non-image file workflows, and broader AI workflows are still future work.

### Cross-Entity Linking

Canonical types already reserve many relationship fields, and Timeline Events now has first-pass picker-style linking plus shared linked-ID validation for the main connected slices, but broader cross-slice validation and richer linked editing are still future work.

### Timeline Logic Depth

The `/timeline` workspace now exists as the sole route-level visual chronology surface and timeline events now support linked-slice pickers, inline workspace authoring, shared linked-ID validation, and year/month/day chronology precision with same-date ordering. Dated events now sort strictly from chronology fields, while undated notch-created events can still preserve relative insertion order through hidden legacy continuity IDs. Richer calendar systems, true timestamps, and more advanced chronology tooling are still future work.

## Planned Later

- broader non-image attachment upload workflow
- broader-slice proposal matching refinement before create/update decisions
- targeted continuity and contradiction review using only relevant existing slice context rather than full-project rereads
- richer AI writing workflows beyond the current brain-dump extraction pass

## Documentation Rule

When updating docs or code, mark a feature as implemented only when it has real route-level and data-layer behavior in the repo. Seeded collections and placeholder pages do not count as implemented slices.

