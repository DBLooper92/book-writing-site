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

- Implemented slices: `books`, `characters`, `locations`, `notes`
- Implemented supporting systems: `projects`, `auth`, `dev setup`
- Placeholder routes only: `timeline`
- Seeded only: most of the remaining collections

## Recommended Build Order

### Immediate Next Slice

- `chapters`

Reason: Books is now implemented. Chapters is the next clean structural step because it begins the manuscript layer beneath books that scenes and later chronology work should attach to.

### Manuscript And Chronology Tier

- `chapters`
- `scenes`
- `timeline_events`

Reason: with Books now in place as the parent manuscript entity, these slices provide the next layer of manuscript and chronology backbone that many other entity types will link into. `timeline_events` stays in this tier because it becomes more useful after books, chapters, and scenes establish the narrative structure it should reference.

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

Build slices in the order that increases practical writing value and future cross-link usefulness, not just in alphabetical order. Books, Characters, Locations, and Notes are already in place; the next biggest value comes from deeper manuscript and chronology structure.
