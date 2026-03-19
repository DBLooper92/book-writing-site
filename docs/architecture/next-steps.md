# Next Steps

This file tracks the short-term development direction implied by the current repo, not the full long-term vision.

## Current Focus

- Keep future entity work inside the existing slice pattern proven by Books, Chapters, Scenes, Characters, Relationships, Factions, Cultures, Eras, Themes, Languages, Species, Items, Locations, Timeline Events, and Notes.
- Books, Chapters, Scenes, and Timeline Events now extend that same slice pattern into manuscript structure and chronology without introducing a separate architecture.
- Factions now extends that same slice pattern into cross-linked worldbuilding data without changing the project-scoped Firestore model.
- Cultures now makes existing `cultureIds` references point at a real slice rather than seed-only records.
- Eras now makes existing `eraId` and `eraIds` references point at a real slice rather than seed-only records.
- Themes now makes existing `primaryThemes`, `themeIds`, and `dominantThemes` references point at a real slice rather than seed-only records.
- Languages now makes existing `languageIds` and `defaultLanguageId` references point at a real slice rather than seed-only records.
- Species now makes existing `speciesId` references point at a real slice rather than seed-only records.
- Items now makes existing item references point at a real slice rather than seed-only records.
- Relationships now turns seeded connection records into a real project-scoped slice without changing the entity architecture.
- Prefer one fully working slice over several new placeholders.
- Keep docs aligned as implementation changes land so the documentation system remains usable as working memory.

## Next Recommended Slice

- `religions`

Reason:
Characters, Cultures, Factions, Timeline Events, and the starter dataset already point at religion records, so `religions` is now the cleanest next slice for turning existing belief-system references into a real navigable slice.

Recommended scope for that pass:

- canonical religion type in `types/`
- Firestore read/write utilities under the active project
- list, create, detail, and edit pages
- normalization compatible with seeded religion documents
- explicit documentation updates in `current-status` and a new feature doc once the slice is real

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
- dedicated delete flow for Species
- dedicated delete flow for Items
- dedicated delete flow for Notes
- richer cross-entity pickers, linked navigation, and validation
- broader `/timeline` workspace work on top of the `timeline_events` slice
- later specialized slices such as `attachments` and `ai_sessions` after core canon-management slices are real
