# Dev Setup

## Status

Implemented now for development scaffolding.

## What Exists

- `app/dev/setup/page.tsx`
- `lib/firebase/dev-init.ts`
- deterministic default project ID: `default-story-bible`
- seeded starter docs across many planned collections
- rerunnable initializer with merge/skip behavior

## Important Rules

- the initializer writes under the authenticated user's `users/{uid}` path
- seeded docs are development scaffolding, not proof that a slice is implemented
- the seed data is meant to make Firestore structure inspectable early
- seed docs should remain compatible with canonical types and UI normalizers

## What Remains Later

- optional richer reset or reseed tooling if ever needed
- a clearer distinction between demo seed content and real project data, if the product evolves beyond personal use
