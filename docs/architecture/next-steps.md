# Next Steps

This file tracks short-term priorities for the desktop-only direction.

## Current Focus

- keep local project open/create/export/apply workflows stable
- finish removing outdated web/Supabase wording from user-facing copy
- keep docs aligned with real desktop runtime behavior
- watch the split Scroll workspace and manuscript editor chrome for ergonomics after author testing, especially pane balance, separator contrast, menu affordance clarity, and selection highlight feel in narrow panes
- watch the new manuscript editor and Draft split-screen/new-window workflow for ergonomics, sparse chapter expansion, measured-width wrapping, and autosave behavior after author testing
- watch manuscript pen-name creation from the settings menu for clarity around profile default versus selected-book default behavior
- watch the new timeline entity editor and bookmark/filter controls for any ergonomics or refresh issues after author testing, including single-collection bookmark accent behavior
- use the per-job AI diagnostics logs to tune multi-event BrainDump prompting when a run drops drafts, truncates JSON, or over/under-splits events
- work through the AI BrainDump cleanup plan in `docs/architecture/ai-brain-dump-cleanup-plan.md`

## Recommended Order

1. Normalize user-facing copy in renderer pages/components to local desktop wording.
2. Audit data-layer naming where legacy web terms can mislead contributors.
3. Validate the split Scroll workspace and manuscript editor against real project data.
4. Tighten proposal review/apply ergonomics in the desktop UI.
5. Decide whether the standalone AI Jobs review route should remain as an admin/fallback surface or become read-only job history now that timeline-launched reviews stay in the timeline.
6. Add an offline replay harness for saved `.ai-jobs` logs so parser and aggregation fixes can be regression-tested without spending model tokens.
7. Revisit whether the entity editor should support editing existing records directly from the timeline workspace, not just quick create flows.

## Deferred

- any return to website-first deployment workflows
- major architecture rewrites not required for desktop stability
