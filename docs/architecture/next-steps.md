# Next Steps

This file tracks the short-term development direction implied by the current repo, not the full long-term vision.

## Current Focus

- Keep future entity work inside the existing slice pattern proven by Books, Chapters, Scenes, Characters, Relationships, Factions, Cultures, Religions, Governments, Organizations, Plot Threads, Outlines, Glossary Terms, Eras, Themes, Languages, Species, Items, Technologies, Locations, Timeline Events, Notes, Retcons, Attachments, and AI Sessions.
- Books, Chapters, Scenes, and Timeline Events now extend that same slice pattern into manuscript structure and chronology without introducing a separate architecture.
- The Timeline workspace now turns `/timeline` into the sole top-level visual chronology surface derived directly from `timeline_events` instead of introducing a second collection or a separate timeline persistence model.
- Factions now extends that same slice pattern into cross-linked worldbuilding data without changing the project-scoped Firestore model.
- Cultures now makes existing `cultureIds` references point at a real slice rather than seed-only records.
- Religions now makes existing `religionIds` references point at a real slice rather than seed-only records.
- Governments now makes existing `governmentId` references point at a real slice rather than seed-only records.
- Organizations now makes existing organization references point at a real slice rather than seed-only records.
- Plot Threads now makes existing narrative-thread references point at a real slice rather than seed-only records.
- Eras now makes existing `eraId` and `eraIds` references point at a real slice rather than seed-only records.
- Themes now makes existing `primaryThemes`, `themeIds`, and `dominantThemes` references point at a real slice rather than seed-only records.
- Languages now makes existing `languageIds` and `defaultLanguageId` references point at a real slice rather than seed-only records.
- Species now makes existing `speciesId` references point at a real slice rather than seed-only records.
- Items now makes existing item references point at a real slice rather than seed-only records.
- Technologies now makes existing `technologyIds` references point at a real slice rather than seed-only records.
- Retcons now turns seeded canon-change records into a real project-scoped slice for old canon, new canon, and downstream impact tracking without changing the entity architecture.
- Attachments now turns seeded reference-file metadata into a real project-scoped slice without pretending a full upload workflow exists yet.
- AI Sessions now turns seeded prompt/output tracking into a real project-scoped slice without making provider-specific workflow metadata the source of truth for canon.
- Outlines now turns seeded planning records into a real project-scoped slice without changing the entity architecture.
- Glossary Terms now turns seeded vocabulary records into a real project-scoped slice without changing the entity architecture.
- Relationships now turns seeded connection records into a real project-scoped slice without changing the entity architecture.
- Prefer one fully working slice over several new placeholders.
- Keep docs aligned as implementation changes land so the documentation system remains usable as working memory.

## Next Recommended Focus

- timeline-linked creation flow and deeper workspace inspection

Reason:
The current long-term entity set now has first-pass slices, `/timeline` is a real visual workspace, and timeline authoring now includes insertion notches, an inline composer sheet, picker-style linking, linked-label resolution, shared linked-ID validation, and year/month/day chronology precision with same-date ordering. The next biggest value is reducing context switching further by letting timeline authoring create missing linked records inline and by making block inspection denser without leaving the workspace.

Recommended scope for that pass:

- keep `/timeline` derived from `timeline_events` rather than introducing a second chronology collection
- let the timeline composer create or stub missing linked records for the most-used slices without inventing a second persistence model
- surface deeper inline summaries or hover/detail previews from timeline blocks and quick-nav items
- tighten chronology integrity checks around predecessor/successor and linked manuscript records
- keep extending linked navigation where existing IDs already point at real slices
- refresh docs as the timeline layer becomes more precise and inspectable

## Follow-Up Cleanup Items

- After the next slice lands, refresh `docs/architecture/current-status.md`, the relevant `docs/features/*.md`, and `docs/reference/entity-roadmap.md` in the same change.
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
- deeper timeline continuity features on top of the current `/timeline` workspace
- later specialized slices building on top of `ai_sessions` and richer file workflows
