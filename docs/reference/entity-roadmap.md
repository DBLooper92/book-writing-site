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

- Implemented slices: `books`, `chapters`, `scenes`, `characters`, `relationships`, `factions`, `cultures`, `eras`, `themes`, `languages`, `species`, `items`, `locations`, `timeline_events`, `notes`
- Implemented supporting systems: `projects`, `auth`, `dev setup`
- Placeholder routes only: `timeline`
- Seeded only: most of the remaining collections

## Recommended Build Order

### Immediate Next Slice

- `religions`

Reason: Characters, Cultures, Factions, Timeline Events, and the seed dataset already point toward religion records, so `religions` is the next clean slice for turning belief-system references into real navigable canon data.

### Manuscript And Chronology Tier

- `timeline_events`

Reason: this chronology layer is now implemented and gives the broader timeline workspace a concrete data foundation.

### Near-Term Worldbuilding Tier

- `religions`

Reason: `religions` is now the next reusable reference layer across characters, cultures, factions, and broader worldbuilding work.

### Deeper Reference Tier

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

Build slices in the order that increases practical writing value and future cross-link usefulness, not just in alphabetical order. Books, Chapters, Scenes, Characters, Factions, Cultures, Eras, Themes, Languages, Species, Items, Locations, Timeline Events, and Notes are already in place; the next biggest value comes from deeper worldbuilding links built on top of that structure.
