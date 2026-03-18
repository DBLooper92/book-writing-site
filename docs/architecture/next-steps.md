# Next Steps

This file tracks the short-term development direction implied by the current repo, not the full long-term vision.

## Current Focus

- Keep future entity work inside the existing slice pattern proven by Books, Characters, Locations, and Notes.
- Books now extends that same slice pattern into manuscript structure without introducing a separate architecture.
- Prefer one fully working slice over several new placeholders.
- Keep docs aligned as implementation changes land so the documentation system remains usable as working memory.

## Next Recommended Slice

- `chapters`

Reason:
Books is now real, so the next highest-value step is the first child manuscript slice. Chapters is the cleanest follow-up because scenes naturally hang from it, and timeline events become more useful once narrative structure exists below the book level.

Recommended scope for that pass:

- canonical chapter type in `types/`
- Firestore read/write utilities under the active project
- list, create, detail, and edit pages
- normalization compatible with seeded chapter documents
- explicit documentation updates in `current-status` and a new feature doc once the slice is real

## Follow-Up Cleanup Items

- After the next slice lands, refresh `docs/architecture/current-status.md`, the relevant `docs/features/*.md`, and `docs/reference/entity-roadmap.md` in the same change.
- Keep `docs/architecture/decision-log.md` limited to durable decisions, not routine implementation notes.
- Preserve the rule that placeholder routes and seeded collections stay documented as partial or planned until real slice behavior exists.

## Deferred Items

- dedicated delete flows for Characters and Locations
- dedicated delete flow for Books
- dedicated delete flow for Notes
- richer cross-entity pickers, linked navigation, and validation
- manuscript structure slices: `chapters` and `scenes`
- chronology slice work for `timeline_events` and the Timeline route
- later specialized slices such as `attachments` and `ai_sessions` after core canon-management slices are real
