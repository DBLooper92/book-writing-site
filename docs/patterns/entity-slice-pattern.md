# Entity Slice Pattern

## Purpose

New structured entity features should follow the existing slice pattern instead of introducing a custom architecture per entity.

Characters is the reference slice. Locations is the second implemented example and confirms the pattern is reusable. Notes is the third implemented example and shows that a content-heavy slice can still stay inside the same architecture. Books is the fourth implemented example and shows that manuscript-structure records can use that same slice pattern too. Chapters is the fifth implemented example and confirms the same approach works for child manuscript records under the active project. Scenes is the sixth implemented example and confirms the pattern still holds at the scene layer without introducing a second manuscript architecture. Timeline Events is the seventh implemented example and confirms the same slice pattern also works for chronology records without turning the broader Timeline workspace into a special case. Cultures is the eighth implemented example and confirms the same approach extends cleanly into deeper worldbuilding reference data. Species is the ninth implemented example and confirms the same approach still holds when singular and plural naming collide at the hook layer. Items is the tenth implemented example and confirms the same slice pattern also works for artifact-style worldbuilding records that already appear in seeded references. Relationships is the eleventh implemented example and confirms the same slice pattern also works for cross-entity connection records. Eras is the twelfth implemented example and confirms the same slice pattern also works for project-scoped historical anchor records. Themes is the thirteenth implemented example and confirms the same slice pattern also works for reusable narrative-reference records. Languages is the fourteenth implemented example and confirms the same slice pattern also works for linguistic-reference records. Religions is the fifteenth implemented example and confirms the same slice pattern also works for belief-system reference records already targeted by seeded cross-entity links. Governments is the sixteenth implemented example and confirms the same slice pattern also works for civic-power reference records already targeted by seeded faction links. Organizations is the seventeenth implemented example and confirms the same slice pattern also works for institutional reference records already targeted by seeded government and religion links. Plot Threads is the eighteenth implemented example and confirms the same slice pattern also works for narrative-thread records already targeted across manuscript, timeline, theme, and note references. Technologies is the nineteenth implemented example and confirms the same slice pattern also works for infrastructure and system-reference records already targeted by timeline data. Outlines is the twentieth implemented example and confirms the same slice pattern also works for planning records without requiring a separate manuscript-planning architecture. Glossary Terms is the twenty-first implemented example and confirms the same slice pattern also works for reusable lore-reference records already targeted by seeded item, theme, and timeline links. Retcons is the twenty-second implemented example and confirms the same slice pattern also works for canon-change tracking records with old canon, new canon, and downstream entity impact. Attachments is the twenty-third implemented example and confirms the same slice pattern also works for metadata-first file-reference records without requiring upload infrastructure in the first pass. AI Sessions is the twenty-fourth implemented example and confirms the same slice pattern also works for summarized workflow-tracking records without making transient AI chat state the source of truth.

## Standard Slice Shape

For an entity such as `characters`, the expected files are:

- `types/character.ts`
- `lib/data/characters.ts`
- `hooks/use-characters.ts`
- `hooks/use-character.ts`
- `components/characters/character-form.tsx`
- `components/characters/character-card.tsx`
- `components/characters/character-detail-section.tsx`
- `app/characters/page.tsx`
- `app/characters/new/page.tsx`
- `app/characters/[characterId]/page.tsx`
- `app/characters/[characterId]/edit/page.tsx`

Future slices should mirror that structure unless there is a strong reason not to.
The current exception is Timeline Events, where `/timeline` now owns the top-level browse/create surface while the slice still keeps its canonical type, data module, hooks, form, detail route, and edit route.

## Responsibilities By Layer

### Canonical Type Module

Owns:

- the canonical entity type
- controlled unions and option lists
- form-value types
- normalization helpers for form input
- builders for new document payloads

### Data Module

Owns:

- table access and scoped filters
- list fetches
- detail fetches
- create operations
- update operations
- row normalization into canonical UI shape
- readable ID generation with suffix collision handling

### Hooks

Own:

- auth and active-project dependency handling
- loading state
- scoped error messages
- entity list or entity detail state

### Route Pages

Own:

- page shell copy
- auth gating
- active-project gating
- empty, loading, and error states
- list/detail/create/edit layout or a deliberate derived-workspace equivalent

### Reusable UI Components

Use when useful:

- form component for create and edit
- card component for list pages
- detail-section component for readable detail pages

## CRUD Interpretation In This Repo

Right now, the practical first-pass slice is:

- list
- create
- detail
- edit

Timeline Events is the current exception: browse and create are intentionally consolidated into `/timeline`, while detail and edit remain dedicated record routes over the same slice data.

Delete can come later. Do not block new slices on delete UI if the rest of the pattern is in place.

## First-Pass Slice Rules

1. Implement the full read/write path for one entity collection.
2. Keep the initial form intentionally smaller than the full canonical document if needed.
3. Still write into a canonical document shape with defaults.
4. Normalize seeded rows and created rows into the same UI-ready type.
5. Keep all reads scoped to the active project.

## Recommended Workflow For A New Slice

1. Define the canonical type in `types/`.
2. Add normalization and CRUD helpers in `lib/data/`.
3. Add `use-entities` and `use-entity` hooks.
4. Build the reusable form.
5. Build list, create, detail, and edit pages unless a stronger derived workspace justifies consolidating the top-level browse/create surface.
6. Add a feature doc and update current status docs.

## Related Docs

- `firestore-patterns.md`
- `typing-and-normalization.md`
- `ui-patterns.md`
- `../features/characters.md`
