# AI Sessions

## Status

Implemented now as the latest full entity slice.

## What Exists

- `types/ai-session.ts`
- `types/ai-brain-dump.ts`
- `lib/ai/brain-dump.ts`
- `lib/data/ai-sessions.ts`
- `hooks/use-ai-sessions.ts`
- `hooks/use-ai-session.ts`
- `components/ai-sessions/ai-session-form.tsx`
- `components/ai-sessions/brain-dump-form.tsx`
- `components/ai-sessions/ai-session-card.tsx`
- `components/ai-sessions/ai-session-brain-dump-detail.tsx`
- `components/ai-sessions/ai-session-detail-section.tsx`
- `app/ai-sessions/page.tsx`
- `app/ai-sessions/brain-dump/page.tsx`
- `app/ai-sessions/new/page.tsx`
- `app/ai-sessions/[aiSessionId]/page.tsx`
- `app/ai-sessions/[aiSessionId]/edit/page.tsx`
- `app/api/ai-sessions/brain-dump/route.ts`

## Important Rules

- AI session rows must stay scoped by `user_id`, `project_id`, and readable `id`
- Supabase rows keep the same scoped shape through `user_id`, `project_id`, and the readable `id`
- the slice follows the same list/create/detail/edit pattern as the existing entity slices
- metadata create/edit stays intentionally focused on summarized session fields, not full transcript storage
- brain-dump extraction stores source text, AI guidance, extraction status, and structured proposal output on the same scoped `ai_sessions` row
- brain-dump extraction now reads the signed-in user's saved OpenAI key from encrypted profile settings instead of a single app-wide OpenAI key
- brain-dump output is reviewable planning structure only, not automatic canon creation
- the server route requires a server-side encryption key so user-saved API keys can be encrypted at rest
- the brain-dump form can be reached from both the dedicated AI Sessions route and the Timeline workspace lightbox
- normalized records are used consistently in the UI
- readable IDs are generated from the title with collision handling

## Current Role In The Architecture

AI Sessions turns tracked brainstorming, summarization, editing, drafting, and first-pass brain-dump extraction work into a real project-scoped slice without letting AI chat state become the source of truth for canon. The active runtime now uses Supabase fetch/refetch reads and writes through `lib/data/ai-sessions.ts`, and the dedicated brain-dump route calls OpenAI with the authenticated user's saved key to turn long-form text into reviewable character, timeline event, chapter outline, and scene proposals stored back on the same scoped row.

## What Remains Later

- delete flow
- author-controlled import or acceptance of proposals into real canon slices
- richer provider integration and operational metadata beyond the current brain-dump path
- optional transcript or message-level tracking beyond the current summary fields and stored source text
- linked navigation and validation against referenced project records
