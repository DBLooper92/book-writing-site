# Current Status

This file documents the state of the desktop app as it exists now.

## Implemented Now

- Electron main process with launcher, project open/create, IPC APIs, and local settings
- local project scaffold generation (`data`, `exports`, `inbox`, `proposals`, `attachments`, `scripts`)
- local SQLite document-table runtime via `better-sqlite3`
- renderer UI routes and entity slices for core canon/manuscript/timeline surfaces
- a production-like desktop preview launcher that builds the renderer and opens Electron without the dev-server path
- export regeneration from local SQLite
- AI brain dump validation suite that seeds sandbox data, materializes timeline records, and regenerates exports
- validation reports preserve the original source brain dump text on each scenario result, including failures
- top navigation now waits for client-side project state after hydration so the server and browser render the same initial markup
- multi-event brain dump parsing now recovers the first valid JSON object or array from mixed model output instead of skipping the whole chunk on extra prose or multiple blobs
- timeline-launched BrainDump creation now opens a card-based composer in the timeline gap, where each card is its own AI or manual event, bookmarks are preserved, and published cards are written back in order
- timeline BrainDump composer insertion controls now stay in the lightbox while authors add cards, bookmark cards, process them one at a time, and publish the finished stack without leaving the chronology
- timeline workspace now includes a centered Timeline/Scroll toggle; Scroll mode shows description-only event sections with inline description editing and compact insertion pluses while keeping the same create/edit workflows
- timeline and Scroll modes now share the same full-width filter bar, with the showing/range summary moved into the header; Timeline mode no longer renders the left quick-map rail, so the chronology fills the width like Scroll
- split Scroll mode now renders as two distinct 50/50 panes with the timeline controls anchored to the left pane, a manuscript editor on the right pane, and stronger active-pane emphasis instead of an appended draft panel
- timeline workspace now supports scroll-display modes for descriptions, both, or summary-only cards; bookmarked filtering, bookmark tags, and a timeline zoom slider capped at 100% are all wired into the workspace model
- timeline and Scroll event cards now only use bookmark collection colors when a single bookmark category is selected in the filter header; bookmarked items stay visually neutral when the filter is not narrowed to one collection
- the scroll workspace now exposes a top-right `Draft` menu that opens a dedicated `/manuscript` editor in a new Electron window or in a split-screen right pane beside the scroll timeline
- the manuscript editor is project-scoped and local-first, with sparse chapter expansion, named/unnamed chapter titles, per-book chapter filters, blank chapter slot autosave, and a dedicated manuscript table keyed by project/book/chapter slot
- timeline event detail now uses split Summary/Description sections, adds bookmark actions and markers, and shows an AI provenance rail for single-event and multi-event brain dumps
- every entity detail view and entity index card now exposes a delete action, and entity deletion prunes cross-entity ID link fields across the local project tables while leaving summaries, descriptions, drafts, and other narrative text intact
- create/edit timeline event flows now open in centered modal lightboxes instead of side sheets, and the workspace includes a reusable entity editor modal for the current slice set with a direct "View all" route back to each index page
- project overview now renders a stable title during SSR and hydration so the dev overlay no longer sees a title swap between the generic shell label and the loaded project name
- Scroll BrainDump review keeps the draft/apply workflow while omitting the redundant pending-approval and generated warning summary copy
- timeline brain dump jobs now write a per-job `.ai-jobs/<jobId>.log.ndjson` sidecar with the generated prompt, raw chunk response, and completion/failure summary for debugging zero-draft runs
- multi-event brain dump chunk parsing now recovers useful drafts when a model returns a bare single-event object, top-level event array, or multiple complete event objects inside an otherwise malformed response
- multi-event brain dump chunk calls use a larger output budget so dense chunks can return several event drafts without truncating midway through JSON
- AI draft apply now reuses repeated entity creations across a multi-draft review/apply batch so obvious repeats do not mint duplicate rows for the same target/name pair
- AI entity suggestions match leading-article variants as exact candidates, so mentions like `Glass Keep` can auto-link to `The Glass Keep`
- proposal status lifecycle in local filesystem

## Transitional Reality

- Some renderer/data code still contains legacy Supabase-oriented naming or copy text.
- Desktop runtime behavior is local-first and should be considered the active direction.

## Planned

- remove remaining legacy web/Supabase-oriented wording from renderer UX and data-layer messages
- continue hardening local-first proposal review and apply workflows
- expand desktop-focused docs as behavior evolves

## Documentation Rule

Mark a feature implemented only when route/runtime behavior exists in this repository.
