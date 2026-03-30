# Brain Dump Implementation Plan

This file defines the preferred execution order for the next brain-dump expansion pass so implementation can continue across multiple sessions without re-planning the whole feature each time.

## Goal

Turn the current dump-only extraction workflow into a staged proposal-resolution system that:

- extracts slice-shaped proposals from raw author text
- matches proposals against existing project records cheaply first
- loads only targeted canon context for deeper review
- lets the author explicitly create, update, merge, or ignore proposals
- keeps structured project data as the source of truth

## Current Status

The core staged brain-dump workflow is now complete for the current main target slices:

- extraction persists structured proposals on scoped `ai_sessions`
- cheap deterministic matching runs before deeper review
- targeted context loads on demand instead of restuffing the whole project
- authors can explicitly review, target, create, update, merge, or ignore timeline, character, chapter, and scene proposals
- docs now describe that implemented workflow as current reality

## Non-Negotiable Constraints

- Do not prompt the model with the whole project canon on every brain dump.
- Do not auto-write canon rows from AI output without explicit user approval.
- Keep all story-bible entity writes scoped by `user_id`, `project_id`, and readable `id`.
- Reuse existing slice normalization and write helpers when turning accepted proposals into real records.
- Keep docs honest about what is implemented versus planned.

## Preferred Execution Order

### Phase 1: Proposal Match Data Model

Add the minimal persisted or derived structures needed to review each proposal against existing records.

Current progress:

- extracted proposals now persist default review metadata inside `ai_sessions.extraction_result`
- timeline proposals now persist placement-suggestion placeholders in that same review structure
- the AI session detail page now shows that review scaffold so future passes can fill it without changing the storage shape again

Target outcomes:

- each proposal can carry a review status
- each proposal can carry a suggested action such as `create`, `update`, `merge`, or `ignore`
- each proposal can point at a matched existing record when one is found
- timeline proposals can carry suggested placement metadata without creating real timeline rows yet

Implementation bias:

- prefer extending `ai_sessions` proposal data before inventing a new persistence table
- keep the data model small enough to support one-by-one author review first
- next unfinished sub-step inside this phase is populating matched existing-record data and non-default suggested actions from the cheap matching pass inputs

### Phase 2: Cheap Matching Pass

Build non-AI matching logic before deeper AI review.

Current progress:

- exact and normalized matching now runs for extracted characters, timeline events, chapter outlines, and scenes against existing scoped project rows
- the cheap match pass now saves ranked candidate matches plus deterministic `create` versus `update` suggestions back onto `ai_sessions.extraction_result`
- timeline proposals now reuse the same cheap matching pass and can point their placement scaffold at a matched existing event when one is found
- same-dump duplicate detection now runs inside those extracted slice groups and can add duplicate candidates plus conservative `merge` suggestions back onto `ai_sessions.extraction_result`
- strong cheap-match results now also populate `ai_sessions.linked_entity_ids`, and weaker generic partial/title-overlap matches are filtered more conservatively before they become review candidates

Target outcomes:

- exact and normalized title/name matching for characters, timeline events, chapters, scenes, and other high-value slices
- simple candidate ranking from existing project records
- basic duplicate detection across extracted proposals from the same dump

Implementation bias:

- prefer deterministic code-side matching first
- only surface a few best candidates per proposal
- avoid loading every slice in full if a smaller targeted query is enough
- cheap matching is now at a sensible checkpoint; the next unfinished phase is targeted context retrieval, starting with on-demand context assembly for the highest-value review surface

### Phase 3: Targeted Context Retrieval

Add the context assembly layer for deeper review and placement suggestions.

Current progress:

- timeline proposals can now load targeted review context on demand from the AI session detail page
- that first targeted-context pass loads matched or top-candidate timeline event summaries, nearby chronology records, and linked character/chapter/scene summaries
- the targeted context remains on-demand, so the initial AI session review page stays cheap until the author asks for deeper context
- timeline targeted context now also derives a first-pass placement recommendation plus focused continuity warnings from the loaded chronology and linked summaries
- targeted timeline continuity review now also compares proposal-linked records against the anchor event's existing character/chapter/scene links
- character proposals can now load targeted review context on demand from the AI session detail page, including matched/candidate character-sheet summaries, linked timeline-event summaries, related-scene summaries, and focused continuity warnings
- chapter proposals can now load targeted review context on demand from the AI session detail page, including matched/candidate chapter summaries, point-of-view character context, linked scene summaries, and focused continuity warnings
- scene proposals can now load targeted review context on demand from the AI session detail page, including matched/candidate scene summaries, parent-chapter context, point-of-view character context, linked timeline-event summaries, and focused continuity warnings

Target outcomes:

- matched character proposals can load the character sheet summary plus linked event summaries
- timeline proposals can load likely neighboring chronology records and linked slice summaries
- scene and chapter proposals can load likely parent manuscript context

Implementation bias:

- fetch only the specific records relevant to the proposal under review
- prefer summaries and linked IDs over full-document payloads when enough
- keep this step available on demand so the first review screen stays cheap
- targeted context coverage across timeline, character, chapter, and scene proposals is now at a sensible checkpoint; the next unfinished phase is the first author-apply vertical slice for timeline review UI

### Phase 4: Timeline Proposal Review UI

Start the author-apply workflow with timeline proposals first.

Current progress:

- timeline proposals already render as review cards inside the AI session detail page
- targeted chronology context already provides first-pass placement recommendations and continuity warnings on demand
- timeline proposals now support author-editable review state in that same review surface, persisting review status, chosen action, placement, optional start/end years, and optional display date label back onto `ai_sessions.extraction_result`
- reviewed timeline proposals can now apply `create`, `update`, or `merge` decisions into real scoped `timeline_events` rows from that same review surface

Target outcomes:

- review cards for each timeline proposal
- suggested placement labels such as beginning, end, before, after, or between existing events
- optional author-entered start/end date fields during review
- explicit apply actions that create a real timeline event or merge/update an existing one

Implementation bias:

- treat timeline as the first vertical slice because that is the user's primary brain-dump entry point
- keep the review surface inside the AI session detail page and/or timeline lightbox flow
- the timeline-first vertical slice is now at a sensible checkpoint; the next unfinished phase is character proposal review/apply

### Phase 5: Character Proposal Review UI

Add create/update/merge review for characters.

Current progress:

- character proposals already show matched candidates, duplicate signals, and targeted character-sheet context inside the AI session detail page
- character proposals now also support author-editable review state in that same review surface, persisting review status and chosen action back onto `ai_sessions.extraction_result`
- reviewed character proposals can now apply `create`, `update`, or `merge` decisions into real scoped `characters` rows from that same review surface

Target outcomes:

- show matched character candidates
- surface contradiction or continuity warnings from targeted context
- allow explicit create versus update decisions

Implementation bias:

- keep the character review surface inside the AI session detail page beside the targeted context already in place
- the character review/apply vertical slice is now at a sensible checkpoint; the next unfinished phase is chapter and scene review/apply

### Phase 6: Chapter And Scene Proposal Review UI

Extend the same review/apply pattern to manuscript structure proposals.

Current progress:

- chapter proposals already show matched candidates and targeted manuscript context inside the AI session detail page
- chapter proposals now also support author-editable review state in that same review surface, persisting review status and chosen action back onto `ai_sessions.extraction_result`
- reviewed chapter proposals can now apply `create`, `update`, or `merge` decisions into real scoped `chapters` rows from that same review surface
- scene proposals already show matched candidates and targeted manuscript-plus-chronology context inside the AI session detail page
- scene proposals now also support author-editable review state in that same review surface, persisting review status and chosen action back onto `ai_sessions.extraction_result`
- reviewed scene proposals can now apply `create`, `update`, or `merge` decisions into real scoped `scenes` rows from that same review surface
- chapter and scene apply paths now also perform a first conservative reverse-link repair pass so safe chapter/scene relationships stay aligned after author-approved applies
- proposal review now lets the author explicitly promote one of the current candidate matches into the saved `matchedRecord` target before `update` or `merge`
- apply now rejects repeat runs by default, requires an explicitly saved `reviewed` status before any canon write, and only allows `update` or `merge` when a saved matched record is present
- character apply now also repairs safe reverse scene and chapter character links for approved related-scene matches

Target outcomes:

- create or update chapter rows through existing slice helpers
- create or update scene rows through existing slice helpers
- preserve book/chapter/scene linkage where the author approves it

Implementation bias:

- keep chapter and scene work incremental rather than shipping both write paths in one pass
- Phase 6 is now complete across both chapter and scene proposals for the current main target slices
- future `Continue` work after this plan should be treated as broader-slice expansion, bug fixing, or deeper polish rather than unfinished core workflow completion

### Phase 7: Broader Slice Expansion

Only after the core review pipeline works well, extend it to other slices such as technologies, locations, factions, or plot threads.

## Continue Protocol

When a future implementation session is told to `Continue`, prefer the next unfinished phase in this file unless local code reality makes a smaller prerequisite necessary.

Expected behavior for continuation work:

- inspect the current state of this plan and the referenced docs first
- if the main staged workflow is already complete, treat future `Continue` work as polish, bug-fixing, live verification follow-up, or broader-slice expansion rather than reopening the completed core phases
- carry the step through code, verification, and doc updates when feasible
- if a phase is too large for one turn, finish one meaningful sub-step and update docs if the repo's documented reality changed

## What Counts As Done

The staged brain-dump expansion is complete only when:

- extraction proposals can be reviewed with suggested actions
- matching happens before expensive model review
- targeted context, not whole-project stuffing, powers contradiction and placement help
- authors can explicitly create, update, merge, or ignore proposals across the main target slices
- docs describe the implemented workflow honestly

The current repo now meets that completion bar for timeline events, characters, chapters, and scenes.

## Related Docs

- `next-steps.md`
- `current-status.md`
- `decision-log.md`
- `../features/ai-sessions.md`
- `../features/timeline.md`
