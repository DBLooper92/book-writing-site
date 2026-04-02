# Next Steps

This file tracks the short-term development direction implied by the current repo, not the full long-term vision.

## Current Focus

- Keep the active Supabase runtime stable now that the backend migration cutover is complete.
- Keep future entity work inside the existing slice pattern proven by Books, Chapters, Scenes, Characters, Relationships, Factions, Cultures, Religions, Governments, Organizations, Plot Threads, Outlines, Glossary Terms, Eras, Themes, Languages, Species, Items, Technologies, Locations, Timeline Events, Notes, Retcons, Attachments, and AI Sessions.
- Books, Chapters, Scenes, and Timeline Events now extend that same slice pattern into manuscript structure and chronology without introducing a separate architecture.
- The Timeline workspace now turns `/timeline` into the sole top-level visual chronology surface derived directly from `timeline_events` instead of introducing a second collection or a separate timeline persistence model.
- Attachments now turns seeded reference-file metadata into a real project-scoped slice and now also backs private image uploads on linked entity detail pages plus manuscript-document uploads for AI import sessions without introducing per-slice media tables.
- AI Sessions now turns seeded prompt/output tracking into a real project-scoped slice and now also supports first-pass brain-dump and manuscript-import workflows without making AI output the source of truth for canon.
- Prefer one fully working slice or workflow over several new placeholders.
- Keep docs aligned as implementation changes land so the documentation system remains usable as working memory.

## Next Recommended Focus

- verify and polish the first-pass manuscript-import workflow before adding broader AI workflow depth

Reason:
The repo now has both the completed core brain-dump bridge and a first-pass manuscript-import path built on `attachments` plus `ai_sessions`. The highest-value next work is to verify that upload, parsing, mapping, chunk processing, and review/apply flows behave cleanly in real use before layering in richer context panels, broader file support, or more automation.

Execution order for the manuscript-import follow-up pass now lives in `manuscript-import-implementation-plan.md`, while `brain-dump-implementation-plan.md` should stay treated as complete for the current core target slices.

Recommended scope for the next pass:

- do live smoke testing of single-book TXT, single-book DOCX, and multi-book manuscript imports from upload through apply
- fix any real runtime defects found in the current manuscript-import setup, mapping, processing, and review/apply flow without reopening the storage model
- tighten manuscript-import review ergonomics and error handling before adding deeper targeted-context endpoints
- preserve project scoping, readable IDs, attachment-backed source files, and explicit review/apply rules on any later expansion
- leave PDF/EPUB support, background queues, richer target search, and deeper contradiction analysis for later

## Follow-Up Cleanup Items

- After the next meaningful runtime change lands, refresh `docs/architecture/current-status.md`, the relevant `docs/features/*.md`, and `docs/reference/entity-roadmap.md` in the same change.
- Keep `docs/architecture/decision-log.md` limited to durable decisions, not routine implementation notes.
- Preserve the rule that placeholder routes and seeded collections stay documented as partial or planned until real slice behavior exists.

## Deferred Items

- dedicated delete flows for Characters and Locations
- dedicated delete flow for Relationships
- dedicated delete flow for Books
- dedicated delete flow for Chapters
- dedicated delete flow for Scenes
- dedicated delete flow for Timeline Events
- dedicated delete flow for Cultures
- dedicated delete flow for Religions
- dedicated delete flow for Governments
- dedicated delete flow for Organizations
- dedicated delete flow for Plot Threads
- dedicated delete flow for Outlines
- dedicated delete flow for Glossary Terms
- dedicated delete flow for Species
- dedicated delete flow for Items
- dedicated delete flow for Technologies
- dedicated delete flow for Notes
- dedicated delete flow for Retcons
- dedicated delete flow for Attachments
- dedicated delete flow for AI Sessions
- richer cross-entity pickers, linked navigation, and validation
- richer chronology tooling on top of the current `/timeline` workspace
- later specialized slices and richer AI workflows building on top of `ai_sessions`, plus broader file workflows beyond the current manuscript document path
