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

- Implemented slices: `characters`, `locations`, `notes`
- Implemented supporting systems: `projects`, `auth`, `dev setup`
- Placeholder routes only: `timeline`
- Seeded only: most of the remaining collections

## Recommended Build Order

### Immediate Next Slice

- `books`

Reason: Notes is now implemented. Books is the next clean structural step because it begins the manuscript layer that chapters, scenes, and later chronology work should attach to.

### Manuscript And Chronology Tier

- `books`
- `chapters`
- `scenes`
- `timeline_events`

Reason: with Notes in place as a practical workspace, these slices provide the manuscript and chronology backbone that many other entity types will link into. `timeline_events` stays in this tier because it becomes more useful after books, chapters, and scenes establish the narrative structure it should reference.

### Near-Term Worldbuilding Tier

- `factions`
- `cultures`
- `species`
- `items`
- `relationships`

Reason: these are already represented in Characters and Locations fields, so implementing them next unlocks meaningful cross-links without expanding too far beyond the current canon model.

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

Build slices in the order that increases practical writing value and future cross-link usefulness, not just in alphabetical order. Characters, Locations, and Notes are already in place; the next biggest value comes from manuscript and chronology structure.
