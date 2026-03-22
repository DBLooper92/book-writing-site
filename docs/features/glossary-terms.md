# Glossary Terms

## Status

Implemented now.

## What Exists

- `types/glossary-term.ts`
- `lib/data/glossary-terms.ts`
- `hooks/use-glossary-terms.ts`
- `hooks/use-glossary-term.ts`
- `components/glossary-terms/glossary-term-form.tsx`
- `components/glossary-terms/glossary-term-card.tsx`
- `components/glossary-terms/glossary-term-detail-section.tsx`
- `app/glossary-terms/page.tsx`
- `app/glossary-terms/new/page.tsx`
- `app/glossary-terms/[glossaryTermId]/page.tsx`
- `app/glossary-terms/[glossaryTermId]/edit/page.tsx`

## Important Rules

- glossary rows must stay scoped by `user_id`, `project_id`, and readable `id`
- the current UI depends on the active project
- the first-pass form is intentionally smaller than the full canonical glossary type
- Supabase rows preserve the same project-scoped record shape through `user_id`, `project_id`, and readable `id`
- normalized records are used consistently in the UI
- readable IDs are generated from the title with collision handling
- seeded glossary docs and user-created docs normalize into the same UI shape

## Why It Matters

The starter dataset already exposes reusable lore terms linked to items, themes, and timeline events. This slice turns those vocabulary records into real navigable canon data without introducing a separate reference system. The active runtime now uses a simple Supabase fetch/refetch path for list, detail, create, and edit behavior.

## What Remains Later

- delete flow
- richer linked navigation from glossary-connected entities
- entity pickers instead of manual ID entry
- filtering, sorting, and search
- broader validation across glossary-linked references


