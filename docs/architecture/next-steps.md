# Next Steps

This file tracks the short-term development direction implied by the current repo, not the full long-term vision.

## Current Focus

- Keep future entity work inside the existing slice pattern proven by Books, Chapters, Scenes, Characters, Factions, Locations, Timeline Events, and Notes.
- Books, Chapters, Scenes, and Timeline Events now extend that same slice pattern into manuscript structure and chronology without introducing a separate architecture.
- Factions now extends that same slice pattern into cross-linked worldbuilding data without changing the project-scoped Firestore model.
- Prefer one fully working slice over several new placeholders.
- Keep docs aligned as implementation changes land so the documentation system remains usable as working memory.

## Next Recommended Slice

- `cultures`

Reason:
Characters, Locations, and Factions already carry `cultureIds`, so `cultures` is now the cleanest next slice for extending the same worldbuilding-link pattern without changing the architecture.

Recommended scope for that pass:

- canonical culture type in `types/`
- Firestore read/write utilities under the active project
- list, create, detail, and edit pages
- normalization compatible with seeded culture documents
- explicit documentation updates in `current-status` and a new feature doc once the slice is real

## Follow-Up Cleanup Items

- After the next slice lands, refresh `docs/architecture/current-status.md`, the relevant `docs/features/*.md`, and `docs/reference/entity-roadmap.md` in the same change.
- Keep `docs/architecture/decision-log.md` limited to durable decisions, not routine implementation notes.
- Preserve the rule that placeholder routes and seeded collections stay documented as partial or planned until real slice behavior exists.

## Deferred Items

- dedicated delete flows for Characters and Locations
- dedicated delete flow for Books
- dedicated delete flow for Chapters
- dedicated delete flow for Scenes
- dedicated delete flow for Timeline Events
- dedicated delete flow for Notes
- richer cross-entity pickers, linked navigation, and validation
- broader `/timeline` workspace work on top of the `timeline_events` slice
- later specialized slices such as `attachments` and `ai_sessions` after core canon-management slices are real
