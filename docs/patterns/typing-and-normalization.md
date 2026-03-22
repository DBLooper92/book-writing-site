# Typing And Normalization

## Canonical Types Define Intent

The canonical TypeScript type in `types/` is the intended schema shape for an entity as the UI should understand it.

This type should be:

- explicit
- stable
- broad enough to support future growth
- safe for direct UI consumption after normalization

## Raw Firestore Data Is Not UI Data

Raw Firestore documents may be:

- partial
- legacy-shaped
- seeded before a UI exists
- inconsistent about arrays, numbers, or timestamps

Normalize documents before they reach components.

Canonical UI types should not depend on provider-specific runtime classes such as Firestore `Timestamp`. Normalize timestamp values into app-local types before they reach hooks and components.

## Recommended Value Layers

Use three layers when helpful:

### Form Values

Optimized for controlled inputs.

Examples:

- string form fields
- comma-separated text for list inputs
- empty string instead of `null`

### Normalized Form Values

Produced at submit time and ready for Firestore writes.

Examples:

- trimmed strings
- parsed integers
- string arrays
- `null` for optional IDs

### Canonical Entity Type

The fully normalized record shape used by hooks, pages, and components.

## Seeded And Created Docs Must Converge

Seeded documents and user-created documents should land in the same UI shape after normalization.

Do not build UIs that only work for newly created docs while seeded docs break, or vice versa.

## Controlled Domain Fields

Use string unions for controlled fields when practical, such as:

- status
- canon level
- confidence
- importance level

Back them with option arrays where forms need labels.

## Normalizer Responsibilities

Normalizers should:

- coerce allowed union values
- return empty arrays instead of bad array shapes
- return `null` for missing nullable references
- preserve IDs and project scope
- provide safe defaults for missing fields

## Practical Rule

UI components should depend on canonical types and normalized form values, not on raw `Record<string, unknown>` document data.
