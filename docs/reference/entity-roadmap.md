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

- Implemented slices: `books`, `chapters`, `scenes`, `characters`, `relationships`, `factions`, `cultures`, `religions`, `governments`, `organizations`, `plot_threads`, `outlines`, `glossary_terms`, `eras`, `themes`, `languages`, `species`, `items`, `technologies`, `locations`, `timeline_events`, `notes`, `retcons`, `attachments`, `ai_sessions`
- Implemented supporting systems: `projects`, `auth`, `dev setup`, `timeline`
- Seeded only: none in the current long-term entity set

## Recommended Build Order

### Immediate Next Slice

- `none`

Reason: The current long-term entity set now has first-pass slices, so the next value comes from chronology integrity, lighter reference loading, and high-value cross-slice navigation rather than another new collection.

### Manuscript And Chronology Tier

- `timeline_events`

Reason: this chronology layer is now implemented and powers the working timeline workspace without requiring a second chronology collection.

### Near-Term Reference Tier

- `attachments` and `ai_sessions` are now implemented, and the current high-value work is workflow polish on top of them

Reason: File metadata and tracked AI workflow records now exist as real slices, and the repo now also has a first-pass manuscript-import workflow built on those two slices. The next gains come from making that upload/process/review/apply path more stable and more operationally useful, not from adding a brand-new collection.

### Deeper Reference Tier

- no additional slice recommended right now

### Later Specialized Tier

- future richer file workflows and AI tooling built on top of `attachments` and `ai_sessions`

## Practical Rule

Build slices in the order that increases practical writing value and future cross-link usefulness, not just in alphabetical order. Books, Chapters, Scenes, Characters, Factions, Cultures, Religions, Governments, Organizations, Plot Threads, Outlines, Glossary Terms, Eras, Themes, Languages, Species, Items, Technologies, Locations, Timeline Events, Notes, Retcons, Attachments, and AI Sessions are already in place; the next biggest value comes from workflow polish on the structures that now exist, especially chronology integrity, lighter timeline reference loading, broader high-value linking across the current slices, and stronger operational workflows such as manuscript import built on top of `attachments` plus `ai_sessions`.
