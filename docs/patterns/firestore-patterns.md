# Firestore Patterns

## Non-Negotiable Path Rule

Do not create global story-bible collections.

Use:

- `users/{uid}/projects/{projectId}/{entityCollection}/{entityId}`

Do not use:

- `characters/{characterId}`
- `locations/{locationId}`
- any other top-level shared entity collection

## Path Scoping

Firestore utilities should accept `uid` and `projectId` explicitly for entity operations. This keeps path ownership obvious and makes the project scope impossible to ignore.

## Cost Discipline

Firestore access should stay as cheap as possible without making the UI feel clumsy.

Practical rule:

- do not add real-time listeners where a one-time read is enough
- keep listeners scoped to the active project and the smallest useful collection or document
- avoid duplicate subscriptions to the same data in multiple places when one shared source will do
- keep writes predictable and minimal, especially for edit flows
- prefer simple document shapes and early-form subsets over expensive derived data systems

Smooth UX still matters, but cost discipline should win over convenience abstractions that multiply reads or writes.

## Timestamps

Use `serverTimestamp()` for `createdAt` and `updatedAt` on writes.

Current repo pattern:

- create writes set both `createdAt` and `updatedAt`
- update writes refresh `updatedAt`
- normalizers accept missing or non-Timestamp values and fall back to `null`

## Normalization Requirement

Never pass raw Firestore document data directly into the UI.

Normalize document fields so UI code receives:

- stable strings
- arrays instead of mixed string-or-array shapes
- controlled union values where possible
- `null` for missing optional IDs and timestamps

## ID Generation

Prefer readable deterministic-ish IDs based on entity names or titles.

Current examples:

- characters: `char_{slug_with_underscores}`
- locations: `loc_{slug_with_underscores}`
- projects: slug-based project ID without a collection prefix

If a generated ID already exists, append `-2`, `-3`, and so on until it is unique.

## Slugs

Use lowercase kebab-case slugs for human-readable fields such as `slug`.

Current slug rules:

- lowercase
- trim whitespace
- replace non-alphanumeric runs with `-`
- trim leading and trailing dashes
- provide a stable fallback like `character`, `location`, or `project`

IDs and slugs are related but not identical:

- slugs use kebab-case
- entity IDs currently convert the slug base to underscore style and add a prefix

## Merge And Update Pattern

Current repo pattern:

- create: `setDoc(ref, fullPayloadWithTimestamps)`
- update: `setDoc(ref, partialPayload, { merge: true })`

Use merge updates for edit flows so unedited fields survive early-form iterations.

## Seed Compatibility

Seeded docs and user-created docs should converge on the same canonical shape after normalization.

That means:

- seeded docs should use the same field names as real slices
- normalizers should tolerate partial or legacy shapes
- new UI code should not special-case seed documents

## Future Collection Guidance

When introducing a new entity collection:

1. pick a stable plural collection name
2. keep it nested under the project
3. define readable ID and slug rules
4. normalize all reads
5. keep seed data compatible with the canonical type
