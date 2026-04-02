# Manuscript Import Implementation Plan

## Status

First-pass implementation now exists in the repo.

## Goal

Allow authors to upload one existing book or a multi-book series as scoped private attachments, break those source files into chapter-first resumable chunks with sub-chunks only for oversized chapters, extract reviewable proposals, and only write canon after explicit author review.

## Implemented In This Pass

- `manuscript_import` AI session type
- `workflow_state` support on `ai_sessions`
- private `project-documents` Supabase Storage bucket for manuscript files
- TXT and DOCX upload support linked to `ai_sessions` through `attachments`
- dedicated `/ai-sessions/manuscript-import` setup page
- prepare route that parses uploads and builds chapter-first per-book chunk plans
- required book-mapping step before extraction
- sequential per-book chunk processing through the signed-in user's saved OpenAI key
- persisted proposal bundles for characters, locations, plot threads, timeline events, chapters, and scenes
- cheap deterministic candidate matching for imported proposals
- AI session detail-page workspace for file status, mapping, processing, review, and apply
- explicit review/apply routes for all current manuscript-import proposal groups

## Current Constraints

- V1 supports `.txt` and `.docx` only
- processing is resumable but not background queued
- processing currently advances one chunk per server call and loops client-side for full-book runs
- review UI is first-pass and does not yet add the deeper targeted-context panels that the brain-dump flow has for its core proposal groups
- location and plot-thread apply paths are conservative first-pass writes and do not yet include richer reverse-link cleanup
- PDF, EPUB, richer target search, and broader contradiction analysis remain later work

## Recommended Follow-Up Order

1. Smoke-test single-book TXT import from upload through apply.
2. Smoke-test single-book DOCX import, especially chapter detection and oversized-chapter boundaries.
3. Smoke-test multi-book series import, including mixed create/update book mapping.
4. Tighten review/apply ergonomics on the manuscript-import detail page without changing the review-first storage model.
5. Add targeted context for the highest-value manuscript-import proposal groups after the first-pass workflow proves stable.
6. Revisit background processing, richer file types, and broader slice expansion only after the current review/apply path is stable in use.
