# Naming Conventions

## Firestore Collections

- use plural collection names
- use snake_case when the name has multiple words

Examples:

- `characters`
- `locations`
- `timeline_events`
- `glossary_terms`
- `plot_threads`

## Entity IDs

- prefer readable IDs
- use a short entity prefix when helpful
- use underscore-separated slug bases inside IDs
- add numeric suffixes for collisions

Examples:

- `char_lyra_vale`
- `loc_greyfen`
- `book_ashes_of_dawn`

## Slugs

- use lowercase kebab-case
- keep them human-readable
- derive from the primary display name or title

Examples:

- `lyra-vale`
- `greyfen`
- `ashes-of-dawn`

## TypeScript

- PascalCase for canonical entity types
- singular entity names for types
- `FormValues` for input shapes
- `Normalized...FormValues` for submit-ready shapes

Examples:

- `Character`
- `Location`
- `CharacterFormValues`
- `NormalizedLocationFormValues`

## Firestore Utility Functions

Use explicit, entity-specific names:

- `observeCharactersForProject`
- `observeCharacterById`
- `createCharacterForProject`
- `updateCharacterForProject`

Avoid generic helpers that hide the collection being touched.

## Hooks

- `use-entities` for list hooks
- `use-entity` for detail hooks

Examples:

- `useCharacters`
- `useCharacter`
- `useLocations`
- `useLocation`

## Components

- singular component names for entity-specific pieces
- `-form`, `-card`, and `-detail-section` suffixes where applicable

## Routes

- use plural collection routes
- use `new` for create pages
- use `[entityId]` for detail pages
- use `[entityId]/edit` for edit pages
