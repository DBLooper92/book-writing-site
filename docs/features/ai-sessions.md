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
- the extraction route now reads structured output more defensively from Responses API payloads, including nested response content, and now returns clearer extraction errors when OpenAI stops before finishing the schema output
- failed brain-dump submissions now also return structured debug metadata to the form and server console, including timeout/config details, the failed `aiSessionId`, response summary, and a truncated raw provider-response preview when one exists
- extracted proposals now persist review scaffolding on the same `ai_sessions` row, including review status, suggested action, matched-record placeholder data, candidate-match slots, and timeline placement suggestion placeholders
- brain-dump extraction now reads the signed-in user's saved OpenAI key from encrypted profile settings instead of a single app-wide OpenAI key
- the current extraction pass reads the pasted dump, then runs a cheap deterministic match pass against existing scoped characters, timeline events, chapters, and scenes before saving the AI session result
- the cheap match pass also detects likely duplicate proposals within the same extracted character, timeline event, chapter outline, or scene set and can suggest `merge` when that duplicate signal is strong
- strong cheap matches now also populate the AI session row's `linked_entity_ids`, while weaker partial or generic title overlaps stay as proposal-level candidates instead of being promoted to session-level links
- timeline proposals can now load targeted review context on demand from the AI session detail page, including matched or candidate timeline event summaries, nearby chronology records, and linked character/chapter/scene summaries
- that targeted timeline context now also includes a first-pass placement recommendation plus focused continuity warnings derived from the loaded chronology and linked summaries
- those continuity warnings now also call out when proposal-linked character, chapter, or scene records are not currently linked on the matched or candidate anchor event
- timeline proposals now also support author-editable review controls in the AI session detail page, persisting review status, chosen action, placement, optional start/end years, and optional display date label back onto the same `ai_sessions` row
- reviewed timeline proposals can now apply `create`, `update`, or `merge` decisions from that same AI session detail page into real scoped `timeline_events` rows, while `ignore` remains a review-only decision with no canon write
- character proposals now also support author-editable review controls in the AI session detail page, persisting review status and chosen action back onto the same `ai_sessions` row before any character canon write happens
- reviewed character proposals can now apply `create`, `update`, or `merge` decisions from that same AI session detail page into real scoped `characters` rows, while `ignore` remains a review-only decision with no canon write
- character apply now also performs conservative reverse-link cleanup for approved related scenes, adding the character back onto matched `scenes.character_ids` rows and their parent `chapters.character_ids` rows
- character proposals can now load targeted review context on demand from the AI session detail page, including matched or candidate character-sheet summaries, linked timeline-event summaries, related-scene summaries, and focused continuity warnings
- chapter proposals now also support author-editable review controls in the AI session detail page, persisting review status and chosen action back onto the same `ai_sessions` row before any chapter canon write happens
- reviewed chapter proposals can now apply `create`, `update`, or `merge` decisions from that same AI session detail page into real scoped `chapters` rows, while `ignore` remains a review-only decision with no canon write
- chapter proposals can now load targeted review context on demand from the AI session detail page, including matched or candidate chapter summaries, point-of-view character context, linked scene summaries, and focused continuity warnings
- scene proposals now also support author-editable review controls in the AI session detail page, persisting review status and chosen action back onto the same `ai_sessions` row before any scene canon write happens
- reviewed scene proposals can now apply `create`, `update`, or `merge` decisions from that same AI session detail page into real scoped `scenes` rows, while `ignore` remains a review-only decision with no canon write
- scene proposals can now load targeted review context on demand from the AI session detail page, including matched or candidate scene summaries, parent-chapter context, point-of-view character context, linked timeline-event summaries, and focused continuity warnings
- chapter and scene apply routes now also perform conservative reverse-link cleanup so safe manuscript links stay bidirectional when a reviewed proposal is applied
- all proposal review panels now let the author explicitly choose one of the current candidate matches as the saved target record before `update` or `merge`
- all proposal apply routes now block repeat applies by default, require the saved review status to be `reviewed`, and only run `update`/`merge` actions when a saved matched record is present
- brain-dump output is reviewable planning structure only, not automatic canon creation
- the server route requires a server-side encryption key so user-saved API keys can be encrypted at rest
- the brain-dump form can be reached from both the dedicated AI Sessions route and the Timeline workspace lightbox
- normalized records are used consistently in the UI
- readable IDs are generated from the title with collision handling

## Current Role In The Architecture

AI Sessions turns tracked brainstorming, summarization, editing, drafting, and staged brain-dump extraction work into a real project-scoped slice without letting AI chat state become the source of truth for canon. The active runtime now uses Supabase fetch/refetch reads and writes through `lib/data/ai-sessions.ts`, and the dedicated brain-dump route calls OpenAI with the authenticated user's saved key to turn long-form text into reviewable character, timeline event, chapter outline, and scene proposals stored back on the same scoped row. That extraction route now also handles structured Responses API payloads more defensively instead of assuming top-level `output_text`, so incomplete or nested schema responses fail more clearly, and failed extractions now return inspectable timeout/provider debug details to both the server console and the brain-dump form. Those proposals now also carry review metadata, deterministic candidate matches against the project's existing characters, timeline events, chapters, and scenes, same-dump duplicate signals that can drive conservative `merge` suggestions, session-level linked IDs for strong matched records, an on-demand targeted timeline-context layer for chronology review, persisted author-editable timeline review state, a real timeline-proposal apply path into scoped `timeline_events` rows, persisted author-editable character review state, a real character-proposal apply path into scoped `characters` rows, persisted author-editable chapter review state, a real chapter-proposal apply path into scoped `chapters` rows, persisted author-editable scene review state, a real scene-proposal apply path into scoped `scenes` rows, an on-demand targeted character-context layer for character-sheet review, an on-demand targeted chapter-context layer for manuscript review, and an on-demand targeted scene-context layer for manuscript-plus-chronology review. The current chapter and scene apply routes also do conservative reverse-link repair so safe existing chapter/scene relationships stay bidirectional after the author applies a proposal, the character apply route now repairs safe reverse scene and chapter character links for approved related-scene matches, and the review/apply layer now lets the author pick one of the saved candidate matches as the explicit target before `update` or `merge` while also requiring an explicitly saved `reviewed` status before any canon write.

## What Remains Later

- delete flow
- cross-slice polish beyond the current timeline, character, chapter, and scene proposal controls, including target search beyond the current saved candidate lists and cleanup on edge-case review/apply flows
- deeper targeted contradiction checks and placement reasoning beyond the current first-pass timeline, character, chapter, and scene proposal context
- deeper contradiction review and richer placement heuristics beyond the current first-pass targeted timeline guidance
- chunking and consolidation for very large dumps so long-form projects do not require one giant prompt
- richer provider integration and operational metadata beyond the current brain-dump path
- optional transcript or message-level tracking beyond the current summary fields and stored source text
- linked navigation and validation against referenced project records
