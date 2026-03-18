# Notes

## Status

Implemented now as the third full entity slice.

## What Exists

- `types/note.ts`
- `lib/firebase/notes.ts`
- `hooks/use-notes.ts`
- `hooks/use-note.ts`
- `components/notes/note-form.tsx`
- `components/notes/note-card.tsx`
- `components/notes/note-detail-section.tsx`
- `app/notes/page.tsx`
- `app/notes/new/page.tsx`
- `app/notes/[noteId]/page.tsx`
- `app/notes/[noteId]/edit/page.tsx`

## Important Rules

- note documents must live under `users/{uid}/projects/{projectId}/notes/{noteId}`
- the slice follows the same list/create/detail/edit pattern as Characters and Locations
- the first-pass form stays intentionally focused on title, note body, and one optional direct link target
- Firestore docs are normalized before use in the UI
- readable IDs are generated from the title with collision handling

## Current Role In The Architecture

Notes adds a text-heavy working slice without introducing a different architecture. It confirms that the same entity-slice pattern can support project-writing support records as well as canon entities like Characters and Locations.

## What Remains Later

- delete flow
- richer note linking and entity pickers
- any deeper hierarchy or tree behavior beyond the current flat project-scoped notes collection
- linked navigation to referenced records
