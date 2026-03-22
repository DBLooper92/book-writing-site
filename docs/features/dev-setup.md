# Dev Setup

## Status

Implemented now for development scaffolding.

## What Exists

- `app/dev/setup/page.tsx`
- `lib/supabase/dev-init.ts`
- deterministic default project ID: `default-story-bible`
- seeded starter docs across many planned collections
- rerunnable initializer with merge/skip behavior

## Important Rules

- the initializer writes scoped rows for the authenticated user and the default active project
- seeded docs are development scaffolding, not proof that a slice is implemented
- the seed data is meant to make the project-scoped schema inspectable early
- seed docs should remain compatible with canonical types and UI normalizers

## What Remains Later

- optional richer reset or reseed tooling if ever needed
- a clearer distinction between demo seed content and real project data, if the product evolves beyond personal use


