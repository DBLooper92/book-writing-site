# BrainDump Testing Handoff

Current focus: timeline-native AI BrainDump review.

## What Changed

- Multi-event BrainDump jobs launched from the timeline now stay anchored to the timeline insertion notch instead of navigating directly to the AI Jobs detail page.
- While the AI job is queued or running, the insertion notch shows an `...` state and is not pressable.
- When generated drafts are available, the notch shows `!`; clicking it opens a timeline review lightbox with editable event draft cards, entity resolution controls, skip controls, and apply.
- If a completed job returns zero drafts, the notch is treated as needing rerun. The review lightbox can rerun the same brain dump using the stored source text and insertion context.
- Multi-event prompts now explicitly support sparse timelines:
  - only Before events means "draft after the last Before event"
  - only After events means "draft before the first After event"
  - missing one side of the context should not cause zero extracted events
- AI job records now store the source `projectContext` alongside the brain dump text.

## Latest Test Situation

The user tested a multi-event dump against a project with one existing timeline event, `North Gate Market Riot`.
The old prompt produced a completed job with zero drafts and only question warnings.
The UI now opens the `!` review lightbox correctly and offers a rerun path for empty jobs.

Next test on the other PC should:

1. Pull latest `master`.
2. Restart the Electron/dev app so `electron/ai-utils.js` prompt changes are loaded.
3. Open the pending `!` BrainDump notch if the empty job is still visible.
4. Use `Rerun BrainDump`, or run a fresh multi-event BrainDump from the same gap.
5. Confirm generated drafts appear as editable event cards in the timeline review lightbox.

## Known Follow-Ups

- Decide whether the standalone AI Jobs review route remains an admin/fallback surface or should become job history only.
- If empty extraction still happens after the prompt fix, inspect the stored `.ai-jobs/*.json` job file and capture raw model output or warnings for the failed run.
- Consider making the empty-job state visually distinct from normal pending approval in the timeline notch label.
