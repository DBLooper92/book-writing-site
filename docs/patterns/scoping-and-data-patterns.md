# Scoping And Data Patterns

## Non-Negotiable Scope Rule

Do not create global story-bible entity tables or rows.

Use:

- `profiles.id` for the signed-in user
- `projects.id` for the active project
- entity rows keyed by `user_id`, `project_id`, and readable `id`

Do not use:

- unscoped entity rows without both `user_id` and `project_id`
- shared global story-bible tables that bypass active-project ownership

## Scope In Data Helpers

Data helpers should accept `uid` and `projectId` explicitly for entity operations. This keeps ownership obvious and makes project scope difficult to ignore by accident.

## Cost Discipline

Supabase access should stay as cheap as possible without making the UI feel clumsy.

Practical rule:

- do not add realtime subscriptions where a one-time read or explicit refetch is enough
- keep queries scoped to the active project and the smallest useful slice
- avoid duplicate reads of the same data in multiple places when one shared source will do
- keep writes predictable and minimal, especially for edit flows
- prefer simple row shapes and early-form subsets over expensive derived data systems

Smooth UX still matters, but cost discipline should win over convenience abstractions that multiply reads or writes.

## Timestamps

Use database defaults or explicit ISO timestamps for `created_at` and `updated_at` on writes.

Current repo pattern:

- create writes set both `created_at` and `updated_at` when the table helper is responsible for them
- update writes refresh `updated_at`
- normalizers accept missing or non-date values and fall back to `null`
- canonical UI records should expose app-local timestamp values rather than provider-specific runtime classes

## Normalization Requirement

Never pass raw backend rows directly into the UI.

Normalize row fields so UI code receives:

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

- create helpers build explicit insert payloads
- update helpers send scoped partial updates

Use partial updates for edit flows so unedited fields survive early-form iterations.

## Seed Compatibility

Seeded rows and user-created rows should converge on the same canonical shape after normalization.

That means:

- seed rows should use the same field names as real slices
- normalizers should tolerate partial or legacy shapes
- new UI code should not special-case seeded records

## Future Table Guidance

When introducing a new entity table:

1. pick a stable plural table name
2. require `user_id`, `project_id`, and readable `id`
3. define readable ID and slug rules
4. normalize all reads
5. keep seed data compatible with the canonical type
