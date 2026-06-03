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
