# Next Steps

This file tracks short-term priorities for the desktop-only direction.

## Current Focus

- keep local project open/create/export/apply workflows stable
- finish removing outdated web/Supabase wording from user-facing copy
- keep docs aligned with real desktop runtime behavior
- tune the new book/chapter Scroll rail filters after author testing, especially long-list scrolling and selected-book/chapter coordination
- tune the new Scroll reading mode after author testing, especially line length, separator contrast, and menu affordance clarity
- use the per-job AI diagnostics logs to tune multi-event BrainDump prompting when a run drops drafts, truncates JSON, or over/under-splits events
- work through the AI BrainDump cleanup plan in `docs/architecture/ai-brain-dump-cleanup-plan.md`

## Recommended Order

1. Normalize user-facing copy in renderer pages/components to local desktop wording.
2. Audit data-layer naming where legacy web terms can mislead contributors.
3. Tighten proposal review/apply ergonomics in the desktop UI.
4. Decide whether the standalone AI Jobs review route should remain as an admin/fallback surface or become read-only job history now that timeline-launched reviews stay in the timeline.
5. Add an offline replay harness for saved `.ai-jobs` logs so parser and aggregation fixes can be regression-tested without spending model tokens.

## Deferred

- any return to website-first deployment workflows
- major architecture rewrites not required for desktop stability
