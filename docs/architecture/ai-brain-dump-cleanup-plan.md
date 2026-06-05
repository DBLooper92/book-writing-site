# AI BrainDump Cleanup Plan

This plan covers the multi-event timeline BrainDump path, where the current behavior is good enough to use but still drops detail and occasionally duplicates entity slices.

## Problems Observed

- Event drafts are sometimes too compressed and lose concrete story mechanics from the source dump.
- AI-generated dates can appear even when the source did not provide them.
- The same entity can be created more than once in a single apply pass.
- Generated event text can merge several distinct beats into one summary when the source really describes a sequence.
- Debugging output exists now, but the prompt and apply flow still need a cleaner fidelity contract.

## Cleanup Goals

- Preserve more source detail in extracted drafts without turning every beat into one huge event.
- Keep date fields empty unless the source or insertion context actually provides dates or a concrete year span.
- Reuse the same created entity record within a single apply pass when the same entity appears more than once.
- Keep recurring worldbuilding mechanics visible as entities, plot threads, or consequences instead of letting them disappear into prose.
- Keep logs useful enough that future prompt regressions are easy to trace.

## Proposed Phases

### Phase 1: Prompt Fidelity

- Add explicit source-fidelity instructions to the multi-event prompt.
- Tell the model not to invent dates, year spans, or chronology order.
- Ask it to preserve recurring systems, incentives, and social structures when they matter to the story.
- Tighten the user prompt so it favors concrete beats over generic summaries.

### Phase 2: Duplicate Reuse

- Cache created entity IDs during a single AI draft apply pass.
- Reuse a previously created entity when a later draft asks for the same target and normalized name.
- Keep the cache local to one apply operation so separate runs still behave independently.

### Phase 3: Structural Review

- Review whether recurring mechanics like prison guilds, battle formats, and time dilation should become explicit plot threads or themes more often.
- Review whether events should always carry the strongest relationship to the previous event or whether some beats should become their own event draft more often.
- Review whether duplicate canonical names should be linked by suggestion resolution instead of creating a second row.

### Phase 4: Validation

- Re-run the Hard Time BrainDump and compare the source text, generated drafts, and saved canon rows.
- Check that the number of duplicate entity rows drops to zero for obvious repeated mentions like the protagonist.
- Check that the model still produces a usable three-event outline when the source contains one.
- Confirm the `.ai-jobs/<jobId>.log.ndjson` sidecar captures the raw chunk request and response for any future regressions.

## Success Criteria

- No duplicate entity rows from one AI apply pass unless the user explicitly wants distinct homonyms.
- Date fields remain blank unless the source or insertion context supports them.
- More of the source's concrete worldbuilding survives into the saved events and slice data.
- The generated timeline remains reviewable rather than exploding into tiny fragments.

