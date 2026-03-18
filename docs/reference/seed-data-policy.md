# Seed Data Policy

## Purpose

Seed data in this repo exists to make the intended Firestore structure visible during development and to provide realistic inspection data for early UI work.

## Current Source Of Truth

`lib/firebase/dev-init.ts` is the current source of truth for development seeding behavior.

## Rules

1. Seed data must stay scoped under `users/{uid}/projects/{projectId}/...`.
2. Seeded collections do not imply implemented UI support.
3. Seed docs should use field names that match the intended canonical schema.
4. Seed docs should be deterministic and readable.
5. Seed docs should normalize cleanly into the same shapes used by real slice UIs.

## Current Behavior

The initializer currently:

- ensures the user doc exists
- creates or updates `default-story-bible`
- seeds one starter document in each planned collection
- skips existing starter docs on rerun
- refreshes user and project metadata with merge writes

## Practical Guidance

When adding a new planned collection:

- decide whether it should be visible in the dev initializer yet
- if yes, add a seed doc that reflects intended schema direction
- keep the seed content modest and structurally useful
- do not let seed complexity outrun actual implementation needs

## Anti-Pattern

Do not treat seed content as stable canon or as substitute product design. It is scaffolding for development, inspection, and iteration.
