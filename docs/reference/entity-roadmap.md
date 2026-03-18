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

- Implemented slices: `books`, `chapters`, `characters`, `locations`, `notes`
- Implemented supporting systems: `projects`, `auth`, `dev setup`
- Placeholder routes only: `timeline`
- Seeded only: most of the remaining collections

## Recommended Build Order

### Immediate Next Slice

- `scenes`

Reason: Books and Chapters are now implemented. Scenes are the next clean structural step because they turn chapter structure into actionable narrative units and make timeline events more useful once scene-level anchors exist.

### Manuscript And Chronology Tier

- `scenes`
- `timeline_events`

Reason: with Books and Chapters now in place as the manuscript backbone, scenes and timeline events provide the next layer that many other entity types will link into. `timeline_events` stays in this tier because it becomes more useful after books, chapters, and scenes establish the narrative structure it should reference.

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

Build slices in the order that increases practical writing value and future cross-link usefulness, not just in alphabetical order. Books, Chapters, Characters, Locations, and Notes are already in place; the next biggest value comes from deeper manuscript and chronology structure.
