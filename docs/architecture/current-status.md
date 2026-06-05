# Current Status

This file documents the state of the desktop app as it exists now.

## Implemented Now

- Electron main process with launcher, project open/create, IPC APIs, and local settings
- local project scaffold generation (`data`, `exports`, `inbox`, `proposals`, `attachments`, `scripts`)
- local SQLite document-table runtime via `better-sqlite3`
- renderer UI routes and entity slices for core canon/manuscript/timeline surfaces
- export regeneration from local SQLite
- AI brain dump validation suite that seeds sandbox data, materializes timeline records, and regenerates exports
- validation reports preserve the original source brain dump text on each scenario result, including failures
- top navigation now waits for client-side project state after hydration so the server and browser render the same initial markup
- multi-event brain dump parsing now recovers the first valid JSON object or array from mixed model output instead of skipping the whole chunk on extra prose or multiple blobs
- timeline-launched multi-event brain dump jobs stay anchored in the timeline gap, lock the insertion notch while running, then show editable generated event drafts inline for review and apply
- timeline BrainDump insertion controls animate running jobs and pending-review calls to action in place, so authors can spot build/review states without leaving the chronology
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
