# Glossary Terms

## Status

Implemented now.

## What Exists

- `types/glossary-term.ts`
- `lib/firebase/glossary-terms.ts`
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

- glossary documents must live under `users/{uid}/projects/{projectId}/glossary_terms/{glossaryTermId}`
- the current UI depends on the active project
- the first-pass form is intentionally smaller than the full canonical glossary type
- Firestore docs are normalized before use in the UI
- readable IDs are generated from the title with collision handling
- seeded glossary docs and user-created docs normalize into the same UI shape

## Why It Matters

The starter dataset already exposes reusable lore terms linked to items, themes, and timeline events. This slice turns those vocabulary records into real navigable canon data without introducing a separate reference system.

## What Remains Later

- delete flow
- richer linked navigation from glossary-connected entities
- entity pickers instead of manual ID entry
- filtering, sorting, and search
- broader validation across glossary-linked references
