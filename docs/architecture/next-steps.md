# Next Steps

This file tracks the short-term development direction implied by the current repo, not the full long-term vision.

## Current Focus

- Keep the active Supabase runtime stable now that the backend migration cutover is complete.
- Keep future entity work inside the existing slice pattern proven by Books, Chapters, Scenes, Characters, Relationships, Factions, Cultures, Religions, Governments, Organizations, Plot Threads, Outlines, Glossary Terms, Eras, Themes, Languages, Species, Items, Technologies, Locations, Timeline Events, Notes, Retcons, Attachments, and AI Sessions.
- Books, Chapters, Scenes, and Timeline Events now extend that same slice pattern into manuscript structure and chronology without introducing a separate architecture.
- The Timeline workspace now turns `/timeline` into the sole top-level visual chronology surface derived directly from `timeline_events` instead of introducing a second collection or a separate timeline persistence model.
- Factions now extends that same slice pattern into cross-linked worldbuilding data without changing the project-scoped model.
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
- Attachments now turns seeded reference-file metadata into a real project-scoped slice and now also backs private image uploads on linked entity detail pages without introducing per-slice media tables.
- AI Sessions now turns seeded prompt/output tracking into a real project-scoped slice and now also supports a first-pass brain-dump extraction workflow without making AI output the source of truth for canon.
- Outlines now turns seeded planning records into a real project-scoped slice without changing the entity architecture.
- Glossary Terms now turns seeded vocabulary records into a real project-scoped slice without changing the entity architecture.
- Relationships now turns seeded connection records into a real project-scoped slice without changing the entity architecture.
- Prefer one fully working slice over several new placeholders.
- Keep docs aligned as implementation changes land so the documentation system remains usable as working memory.

## Next Recommended Focus

- keep the now-complete staged brain-dump workflow stable and only expand it beyond the current main target slices when there is a clear product reason

Reason:
The repo now has the intended staged bridge from raw brain-dump text into structured canon: extraction, cheap matching, on-demand targeted context, explicit review, and author-approved apply paths across timeline events, characters, chapters, and scenes. The next high-value work is no longer “finish brain dump,” but either runtime verification/polish or optional broader-slice expansion built on the completed core pattern.

Execution order for the finished core workflow remains documented in `brain-dump-implementation-plan.md`, but future work should treat that plan as complete for the current target slices rather than as an open unfinished feature.

Recommended scope for the next pass:

- do live smoke testing of the completed timeline, character, chapter, and scene review/apply flows
- fix any real runtime defects found during that verification without reopening the core architecture
- only expand brain-dump to additional slices such as locations, factions, technologies, or plot threads if the current main-slice workflow proves solid in use
- preserve project scoping, readable IDs, targeted-context loading, and explicit author review/apply rules on any later expansion
- leave broader target search, richer contradiction analysis, autonomous batch operations, and full-project prompt stuffing for later

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
- later specialized slices and richer AI workflows building on top of `ai_sessions`, plus broader non-image file workflows
