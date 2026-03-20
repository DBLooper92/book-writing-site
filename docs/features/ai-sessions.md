# AI Sessions

## Status

Implemented now as the latest full entity slice.

## What Exists

- `types/ai-session.ts`
- `lib/firebase/ai-sessions.ts`
- `hooks/use-ai-sessions.ts`
- `hooks/use-ai-session.ts`
- `components/ai-sessions/ai-session-form.tsx`
- `components/ai-sessions/ai-session-card.tsx`
- `components/ai-sessions/ai-session-detail-section.tsx`
- `app/ai-sessions/page.tsx`
- `app/ai-sessions/new/page.tsx`
- `app/ai-sessions/[aiSessionId]/page.tsx`
- `app/ai-sessions/[aiSessionId]/edit/page.tsx`

## Important Rules

- AI session documents must live under `users/{uid}/projects/{projectId}/ai_sessions/{sessionId}`
- the slice follows the same list/create/detail/edit pattern as the existing entity slices
- the first-pass form stays intentionally focused on summarized session metadata, not provider integrations or full transcript storage
- Firestore docs are normalized before use in the UI
- readable IDs are generated from the title with collision handling

## Current Role In The Architecture

AI Sessions turns tracked brainstorming, summarization, editing, and drafting work into a real project-scoped slice without letting AI chat state become the source of truth for canon. It preserves explicit linked entities and summarized prompt/output metadata while keeping the current pass inexpensive and inspectable.

## What Remains Later

- delete flow
- richer provider integration and operational metadata
- optional transcript or message-level tracking beyond the current summary fields
- linked navigation and validation against referenced project records
