# Entity Roadmap

## Long-Term Entity Set

The long-term story-bible model is expected to include at least:

- `ai_sessions`
- `attachments`
- `books`
- `chapters`
- `characters`
- `cultures`
- `eras`
- `factions`
- `glossary_terms`
- `governments`
- `items`
- `languages`
- `locations`
- `notes`
- `organizations`
- `outlines`
- `plot_threads`
- `relationships`
- `religions`
- `retcons`
- `scenes`
- `species`
- `technologies`
- `themes`
- `timeline_events`

## Current Status Snapshot

- Implemented slices: `books`, `chapters`, `scenes`, `characters`, `factions`, `locations`, `timeline_events`, `notes`
- Implemented supporting systems: `projects`, `auth`, `dev setup`
- Placeholder routes only: `timeline`
- Seeded only: most of the remaining collections

## Recommended Build Order

### Immediate Next Slice

- `cultures`

Reason: Characters, Locations, and Factions already point toward culture records, so `cultures` is the next clean slice for extending real navigable canon data through an existing reference field.

### Manuscript And Chronology Tier

- `timeline_events`

Reason: this chronology layer is now implemented and gives the broader timeline workspace a concrete data foundation.

### Near-Term Worldbuilding Tier

- `cultures`
- `species`
- `items`
- `relationships`

Reason: these are already represented in Characters, Factions, Locations, and Timeline Events fields, so implementing them next unlocks meaningful cross-links without expanding too far beyond the current canon model.

### Deeper Reference Tier

- `eras`
- `themes`
- `languages`
- `religions`
- `governments`
- `organizations`
- `plot_threads`

### Later Specialized Tier

- `outlines`
- `retcons`
- `glossary_terms`
- `technologies`
- `attachments`
- `ai_sessions`

## Practical Rule

Build slices in the order that increases practical writing value and future cross-link usefulness, not just in alphabetical order. Books, Chapters, Scenes, Characters, Factions, Locations, Timeline Events, and Notes are already in place; the next biggest value comes from deeper worldbuilding links built on top of that structure.
