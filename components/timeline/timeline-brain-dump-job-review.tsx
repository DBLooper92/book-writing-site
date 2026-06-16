"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  createTimelineEventForProject,
  getTimelineEventById,
  updateTimelineEventForProject,
} from "@/lib/data/timeline-events";
import { applyAiDraftResolutionsToTimelineValues } from "@/lib/timeline/ai-draft-apply";
import {
  getInsertionBoundaryEventIds,
  validateInsertionTimelineEventChronology,
} from "@/lib/timeline/insertion-anchors";
import { rewireTimelineInsertionBoundaryLinksForProject } from "@/lib/timeline/insertion-links-runtime";
import {
  getInsertionBoundaryChronologyParts,
  type TimelineLayoutInsertionItem,
} from "@/lib/timeline/layout";
import type {
  AiMultiEventJobRecord,
  BrainDumpEntitySuggestion,
  BrainDumpResolution,
  MultiEventApplyReport,
  MultiEventBrainDumpEventDraft,
} from "@/types/ai-brain-dump";
import {
  normalizeTimelineEventFormValues,
  validateNormalizedTimelineEventFormValues,
  type TimelineEventFormValues,
} from "@/types/timeline-event";

type TimelineBrainDumpJobReviewProps = {
  activeProjectId: string;
  job: AiMultiEventJobRecord;
  onApproved: () => Promise<void> | void;
  onRerun?: () => Promise<void> | void;
  rerunning?: boolean;
  streamlined?: boolean;
  uid: string;
};

type ReviewResolutionState = {
  action: "" | "create" | "ignore" | "link";
  linkedId: string;
  touched: boolean;
};

type DraftReviewState = {
  draftValues: TimelineEventFormValues;
  predecessorDraftIds: string[];
  resolutionsBySuggestionId: Record<string, ReviewResolutionState>;
  skipped: boolean;
  successorDraftIds: string[];
};

export function TimelineBrainDumpJobReview({
  activeProjectId,
  job,
  onApproved,
  onRerun,
  rerunning = false,
  streamlined = false,
  uid,
}: TimelineBrainDumpJobReviewProps) {
  const drafts = useMemo(() => job.result?.events ?? [], [job.result?.events]);
  const sourceQuestionNotes = useMemo(
    () => extractQuestionLikeNoteLines(job.input?.brainDumpText ?? ""),
    [job.input?.brainDumpText]
  );
  const [draftStateById, setDraftStateById] = useState<Record<string, DraftReviewState>>({});
  const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyReport, setApplyReport] = useState<MultiEventApplyReport | null>(null);
  const [postApplyWarnings, setPostApplyWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const initializedJobIdRef = useRef<string | null>(null);
  const lastSavedReviewSnapshotRef = useRef<string | null>(null);

  useEffect(() => {
    if (job.status !== "completed" || initializedJobIdRef.current === job.id) {
      return;
    }

    const nextSelectedDraftId =
      job.reviewState?.selectedDraftId && drafts.some((draft) => draft.draftId === job.reviewState?.selectedDraftId)
        ? job.reviewState.selectedDraftId
        : drafts[0]?.draftId ?? null;
    const nextState = buildInitialDraftReviewState(drafts, job.reviewState?.draftStateById ?? null);

    setDraftStateById(nextState);
    setExpandedDraftId(nextSelectedDraftId);
    setApplyReport(null);
    setPostApplyWarnings([]);
    initializedJobIdRef.current = job.id;
    lastSavedReviewSnapshotRef.current = buildReviewSnapshotKey(
      job.id,
      nextSelectedDraftId,
      nextState,
      job.reviewState?.status ?? "pending"
    );
  }, [
    drafts,
    job.id,
    job.reviewState?.draftStateById,
    job.reviewState?.selectedDraftId,
    job.reviewState?.status,
    job.status,
  ]);

  const totalUnresolvedCount = useMemo(() => {
    return drafts.reduce((count, draft) => {
      const state = draftStateById[draft.draftId];

      if (!state || state.skipped) {
        return count;
      }

      return count + getUnresolvedCount(draft.entitySuggestions, state.resolutionsBySuggestionId);
    }, 0);
  }, [draftStateById, drafts]);

  function updateDraft(
    draftId: string,
    updater: (current: DraftReviewState) => DraftReviewState
  ) {
    setDraftStateById((current) => {
      const existing = current[draftId];

      if (!existing) {
        return current;
      }

      return {
        ...current,
        [draftId]: updater(existing),
      };
    });
  }

  useEffect(() => {
    if (job.status !== "completed" || initializedJobIdRef.current !== job.id) {
      return;
    }
    if (job.reviewState?.status === "applied") {
      return;
    }

    const nextSnapshotKey = buildReviewSnapshotKey(job.id, expandedDraftId, draftStateById, "pending");

    if (lastSavedReviewSnapshotRef.current === nextSnapshotKey) {
      return;
    }

    const saveTimer = window.setTimeout(() => {
      void window.bookBible.ai
        .updateJobReviewState({
          jobId: job.id,
          reviewState: serializeJobReviewState({
            appliedAt: job.reviewState?.appliedAt ?? null,
            draftStateById,
            savedAt: new Date().toISOString(),
            selectedDraftId: expandedDraftId,
            status: "pending",
          }),
        })
        .then((updated) => {
          if (updated) {
            lastSavedReviewSnapshotRef.current = nextSnapshotKey;
          }
        });
    }, 300);

    return () => {
      window.clearTimeout(saveTimer);
    };
  }, [
    draftStateById,
    expandedDraftId,
    job.id,
    job.reviewState?.appliedAt,
    job.reviewState?.status,
    job.status,
  ]);

  async function handleApplyReviewedEvents() {
    const report: MultiEventApplyReport = {
      failed: [],
      skipped: [],
      success: [],
    };
    const createdByDraftId = new Map<string, string>();
    const createdRecordIdsByKey = new Map<string, string>();
    const createdValuesByDraftId = new Map<
      string,
      {
        predecessorDraftIds: string[];
        successorDraftIds: string[];
        values: ReturnType<typeof normalizeTimelineEventFormValues>;
      }
    >();
    const relationWarnings: string[] = [];
    const insertionBoundaryIds = getInsertionBoundaryEventIds(
      job.input?.projectContext?.insertionContext ?? null
    );
    const expandedReviewState = expandedDraftId ? draftStateById[expandedDraftId] : null;

    setApplying(true);
    setError(null);

    try {
      if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
        console.log("[timeline:multi-review] applying drafts", {
          jobId: job.id,
          insertionItemId: job.input?.timelineInsertionItemId ?? null,
          draftCount: drafts.length,
          expandedDraftId,
          predecessorDraftIds: expandedReviewState?.predecessorDraftIds ?? [],
          successorDraftIds: expandedReviewState?.successorDraftIds ?? [],
          insertionBoundaryIds,
        });
      }

      let insertionValidationItem: TimelineLayoutInsertionItem | null = null;

      try {
        insertionValidationItem = await buildInsertionValidationItem({
          activeProjectId,
          boundaryEventIds: insertionBoundaryIds,
          uid,
        });
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Unable to read the insertion boundary dates."
        );
        return;
      }

      if (insertionValidationItem) {
        for (const draft of drafts) {
          const reviewState = draftStateById[draft.draftId];

          if (!reviewState || reviewState.skipped) {
            continue;
          }

          const unresolved = getUnresolvedCount(
            draft.entitySuggestions,
            reviewState.resolutionsBySuggestionId
          );

          if (unresolved > 0) {
            continue;
          }

          const mergedDraftValues = mergeDraftValuesForApply(
            draft.prefill,
            reviewState.draftValues
          );
          const normalizedValues = normalizeTimelineEventFormValues(mergedDraftValues);
          const validation = validateNormalizedTimelineEventFormValues(normalizedValues);

          if (validation.errors.length > 0) {
            continue;
          }

          const insertionError = validateInsertionTimelineEventChronology(
            normalizedValues,
            insertionValidationItem
          );

          if (insertionError) {
            setError(
              `Draft "${normalizedValues.title.trim() || draft.draftId}" does not fit the selected insertion gap. ${insertionError}`
            );
            return;
          }
        }
      }

      for (const draft of drafts) {
        const reviewState = draftStateById[draft.draftId];

        if (!reviewState || reviewState.skipped) {
          report.skipped.push({
            draftId: draft.draftId,
            reason: "Marked skipped in review.",
          });
          continue;
        }

        const unresolved = getUnresolvedCount(
          draft.entitySuggestions,
          reviewState.resolutionsBySuggestionId
        );

        if (unresolved > 0) {
          report.failed.push({
            draftId: draft.draftId,
            error: `Unresolved entity suggestions (${unresolved}).`,
          });
          continue;
        }

        const mergedDraftValues = mergeDraftValuesForApply(draft.prefill, reviewState.draftValues);
        const normalizedValues = normalizeTimelineEventFormValues(mergedDraftValues);
        const validation = validateNormalizedTimelineEventFormValues(normalizedValues);

        if (validation.errors.length > 0) {
          report.failed.push({
            draftId: draft.draftId,
            error: validation.errors[0],
          });
          continue;
        }

        const aiDraftState = {
          approvedAt: new Date().toISOString(),
          brainDumpText: job.input?.brainDumpText ?? "",
          preview: {
            entitySuggestions: draft.entitySuggestions,
            prefill: mergedDraftValues,
            warnings: draft.warnings,
          },
          resolutions: buildResolutions(
            draft.entitySuggestions,
            reviewState.resolutionsBySuggestionId
          ),
        };

        try {
          const valuesWithResolvedEntities = await applyAiDraftResolutionsToTimelineValues({
            activeProjectId,
            aiDraftState,
            createdRecordIdsByKey,
            uid,
            values: normalizedValues,
          });
          const mappedPredecessors = reviewState.predecessorDraftIds
            .map((predecessorDraftId) => createdByDraftId.get(predecessorDraftId) ?? "")
            .filter(Boolean);
          valuesWithResolvedEntities.predecessorEventIds = unique([
            ...valuesWithResolvedEntities.predecessorEventIds,
            ...mappedPredecessors,
          ]);
          valuesWithResolvedEntities.successorEventIds = [];

          const createdTimelineEventId = await createTimelineEventForProject(
            uid,
            activeProjectId,
            valuesWithResolvedEntities,
            {
              creationSource: "ai_multi",
              sourceBrainDumpText: job.input?.brainDumpText ?? "",
              sourceInsertionItemId: job.input?.timelineInsertionItemId ?? null,
              sourceJobId: job.id,
            }
          );
          createdByDraftId.set(draft.draftId, createdTimelineEventId);
          createdValuesByDraftId.set(draft.draftId, {
            predecessorDraftIds: reviewState.predecessorDraftIds,
            successorDraftIds: reviewState.successorDraftIds,
            values: valuesWithResolvedEntities,
          });
          report.success.push({
            createdTimelineEventId,
            draftId: draft.draftId,
          });

          if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
            console.log("[timeline:multi-review] created draft", {
              draftId: draft.draftId,
              createdTimelineEventId,
              predecessorEventIds: valuesWithResolvedEntities.predecessorEventIds,
              successorEventIds: valuesWithResolvedEntities.successorEventIds,
            });
          }
        } catch (nextError) {
          report.failed.push({
            draftId: draft.draftId,
            error: nextError instanceof Error ? nextError.message : "Unknown save error.",
          });
        }
      }

      for (const success of report.success) {
        const entry = createdValuesByDraftId.get(success.draftId);

        if (!entry) {
          continue;
        }

        const predecessorEventIds = unique(
          entry.predecessorDraftIds
            .map((draftId) => createdByDraftId.get(draftId) ?? "")
            .filter(Boolean)
        );
        const successorEventIds = unique(
          entry.successorDraftIds
            .map((draftId) => createdByDraftId.get(draftId) ?? "")
            .filter(Boolean)
        );
        const isFirstCreatedDraft = success.draftId === report.success[0]?.draftId;
        const isLastCreatedDraft = success.draftId === report.success[report.success.length - 1]?.draftId;

        try {
          await updateTimelineEventForProject(uid, activeProjectId, success.createdTimelineEventId, {
            ...entry.values,
            predecessorEventIds: unique([
              ...predecessorEventIds,
              ...(isFirstCreatedDraft && insertionBoundaryIds.previousEventId
                ? [insertionBoundaryIds.previousEventId]
                : []),
            ]),
            successorEventIds: unique([
              ...successorEventIds,
              ...(isLastCreatedDraft && insertionBoundaryIds.nextEventId
                ? [insertionBoundaryIds.nextEventId]
                : []),
            ]),
          });
        } catch (nextError) {
          relationWarnings.push(
            `Could not update links for ${success.draftId}: ${
              nextError instanceof Error ? nextError.message : "Unknown link update error."
            }`
          );
        }
      }

      setApplyReport(report);
      setPostApplyWarnings(relationWarnings);

      if (report.success.length > 0) {
        try {
          await rewireTimelineInsertionBoundaryLinksForProject({
            boundaryEventIds: insertionBoundaryIds,
            insertedEventIds: report.success.map((success) => success.createdTimelineEventId),
            projectId: activeProjectId,
            uid,
          });
        } catch (error) {
          relationWarnings.push(
            error instanceof Error ? error.message : "Failed to rewire insertion boundary links."
          );
          setPostApplyWarnings(relationWarnings);
        }
      }

      if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
        console.log("[timeline:multi-review] apply finished", {
          jobId: job.id,
          successCount: report.success.length,
          failedCount: report.failed.length,
          skippedCount: report.skipped.length,
          relationWarnings,
          createdTimelineEventIds: report.success.map((success) => success.createdTimelineEventId),
        });
      }

      if (report.success.length > 0 && report.failed.length === 0) {
        const appliedReviewState = serializeJobReviewState({
          appliedAt: new Date().toISOString(),
          draftStateById,
          savedAt: new Date().toISOString(),
          selectedDraftId: expandedDraftId,
          status: "applied",
        });
        await window.bookBible.ai.updateJobReviewState({
          jobId: job.id,
          reviewState: appliedReviewState,
        });
        lastSavedReviewSnapshotRef.current = buildReviewSnapshotKey(
          job.id,
          expandedDraftId,
          draftStateById,
          "applied"
        );
        await onApproved();
      }
    } finally {
      setApplying(false);
    }
  }

  if (job.status !== "completed") {
    return (
      <section className="rounded-3xl border border-sky-200 bg-sky-50 p-5 text-sm leading-6 text-sky-900">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
          AI building
        </p>
        <p className="mt-2 font-medium">Multi-event BrainDump is extracting timeline drafts.</p>
        <p className="mt-1">
          {job.progress.completedChunks} of {job.progress.totalChunks || "?"} chunk(s) complete.
          The insertion notch stays locked while the AI is working.
        </p>
      </section>
    );
  }

  if (drafts.length === 0) {
    return (
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
        <p className="font-medium">No event drafts were extracted from this BrainDump job.</p>
        {job.warnings.length > 0 ? <p className="mt-2">{job.warnings.join(" ")}</p> : null}
        {onRerun ? (
          <button
            type="button"
            onClick={() => void onRerun()}
            disabled={rerunning}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {rerunning ? "Rerunning..." : "Rerun BrainDump"}
          </button>
        ) : null}
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {streamlined ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void handleApplyReviewedEvents()}
            disabled={applying}
            className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {applying ? "Applying..." : "Apply"}
          </button>
        </div>
      ) : (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">
              Pending approval
            </p>
            <h3 className="mt-2 text-lg font-semibold tracking-tight text-zinc-950">
              Review {drafts.length} generated timeline event(s)
            </h3>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              Edit the drafts in place, resolve entity suggestions, skip anything that should not
              become canon, then apply them into the timeline.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleApplyReviewedEvents()}
            disabled={applying}
            className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {applying ? "Applying..." : "Apply reviewed events"}
          </button>
        </div>
        {totalUnresolvedCount > 0 ? (
          <p className="mt-3 rounded-2xl border border-amber-300 bg-white/60 px-3 py-2 text-sm text-amber-900">
            Resolve {totalUnresolvedCount} entity suggestion(s), or skip the related draft before
            applying.
          </p>
        ) : null}
        {error ? (
          <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        </div>
      )}

      {streamlined && error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(20rem,0.42fr)_minmax(0,0.58fr)]">
        <BrainDumpSourcePanel text={job.input?.brainDumpText ?? ""} />

        <div className="space-y-4">
          {!streamlined && job.warnings.length > 0 ? (
            <div className="rounded-3xl border border-amber-200 bg-white p-4 text-sm text-amber-900">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                Job notes
              </p>
              {sourceQuestionNotes.length > 0 ? (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                  <p className="leading-6">
                    {sourceQuestionNotes.length} source note{sourceQuestionNotes.length === 1 ? "" : "s"} were captured from the raw brain dump.
                    They are raw author commentary, not canon, and you can disregard them unless you want to turn one into a draft.
                  </p>
                  <ul className="mt-3 space-y-2">
                    {sourceQuestionNotes.map((note, index) => (
                      <li key={`${index}-${note}`} className="leading-6">
                        <span className="mr-2 inline-flex rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-800">
                          Note {index + 1}
                        </span>
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {job.warnings.length > 0 ? <p className="mt-3 text-sm leading-6">{job.warnings.join(" ")}</p> : null}
            </div>
          ) : null}

          <div className="space-y-4">
            {drafts.map((draft, index) => {
              const state = draftStateById[draft.draftId];
              const expanded = expandedDraftId === draft.draftId;

              return (
                <TimelineDraftCard
                  allDrafts={drafts}
                  draft={draft}
                  expanded={expanded}
                  key={draft.draftId}
                  position={index + 1}
                  reviewState={state}
                  onToggleExpanded={() =>
                    setExpandedDraftId((current) => (current === draft.draftId ? null : draft.draftId))
                  }
                  onUpdate={(updater) => updateDraft(draft.draftId, updater)}
                />
              );
            })}
          </div>

          {applyReport ? (
            <section className="rounded-3xl border border-zinc-200 bg-white p-5">
              <h3 className="text-base font-semibold tracking-tight text-zinc-950">Apply report</h3>
              <p className="mt-2 text-sm text-zinc-600">
                Created {applyReport.success.length}, failed {applyReport.failed.length}, skipped{" "}
                {applyReport.skipped.length}.
              </p>
              {applyReport.failed.length > 0 ? (
                <ul className="mt-3 space-y-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {applyReport.failed.map((entry) => (
                    <li key={entry.draftId}>
                      {entry.draftId}: {entry.error}
                    </li>
                  ))}
                </ul>
              ) : null}
              {postApplyWarnings.length > 0 ? (
                <ul className="mt-3 space-y-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {postApplyWarnings.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function BrainDumpSourcePanel({ text }: { text: string }) {
  return (
    <aside className="xl:sticky xl:top-4">
      <section className="flex max-h-[calc(100vh-2rem)] min-h-[28rem] flex-col rounded-3xl border border-zinc-300 bg-white shadow-[0_24px_70px_-48px_rgba(24,24,27,0.7)]">
        <div className="border-b border-zinc-200 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Source BrainDump
          </p>
          <h3 className="mt-1 text-sm font-semibold tracking-tight text-zinc-950">
            Original raw text
          </h3>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-5 text-zinc-700">
            {text || "No source text was saved with this job."}
          </pre>
        </div>
      </section>
    </aside>
  );
}

function TimelineDraftCard({
  allDrafts,
  draft,
  expanded,
  onToggleExpanded,
  onUpdate,
  position,
  reviewState,
}: {
  allDrafts: MultiEventBrainDumpEventDraft[];
  draft: MultiEventBrainDumpEventDraft;
  expanded: boolean;
  onToggleExpanded: () => void;
  onUpdate: (updater: (current: DraftReviewState) => DraftReviewState) => void;
  position: number;
  reviewState: DraftReviewState | undefined;
}) {
  const values = reviewState?.draftValues ?? draft.prefill;
  const unresolvedCount =
    reviewState && !reviewState.skipped
      ? getUnresolvedCount(draft.entitySuggestions, reviewState.resolutionsBySuggestionId)
      : 0;
  const attentionItems = getDraftAttentionItems(draft, reviewState, unresolvedCount);

  return (
    <article
      className={`rounded-3xl border p-5 shadow-[0_20px_45px_-38px_rgba(24,24,27,0.4)] transition ${
        reviewState?.skipped
          ? "border-zinc-200 bg-zinc-100 opacity-75"
          : "border-zinc-950 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            AI draft {position}
          </p>
          <h3 className="mt-2 text-lg font-semibold tracking-tight text-zinc-950">
            {values.title || "Untitled generated event"}
          </h3>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            {values.summary || "No summary extracted yet."}
          </p>
          {attentionItems.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {attentionItems.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-900"
                >
                  {item}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
          {values.displayDateLabel.trim() || values.yearStart || "Undated"}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-4">
        <p className="text-sm text-zinc-600">
          {unresolvedCount > 0
            ? `${unresolvedCount} entity suggestion(s) need review`
            : reviewState?.skipped
              ? "Skipped"
              : "Ready for approval"}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              onUpdate((current) => ({
                ...current,
                skipped: !current.skipped,
              }))
            }
            className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition ${
              reviewState?.skipped
                ? "bg-zinc-950 text-white hover:bg-zinc-800"
                : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {reviewState?.skipped ? "Unskip" : "Skip"}
          </button>
          <button
            type="button"
            onClick={onToggleExpanded}
            className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            {expanded ? "Collapse" : "Review draft"}
          </button>
        </div>
      </div>

      {expanded && reviewState ? (
        <div className="mt-5 space-y-4 border-t border-zinc-200 pt-5">
          <DraftFieldsEditor
            value={reviewState.draftValues}
            onChange={(nextValues) =>
              onUpdate((current) => ({
                ...current,
                draftValues: nextValues,
              }))
            }
          />
          <DraftLinkEditor
            allDrafts={allDrafts}
            currentDraftId={draft.draftId}
            predecessorDraftIds={reviewState.predecessorDraftIds}
            successorDraftIds={reviewState.successorDraftIds}
            onChange={(next) =>
              onUpdate((current) => ({
                ...current,
                predecessorDraftIds: next.predecessorDraftIds,
                successorDraftIds: next.successorDraftIds,
              }))
            }
          />
          <section className="space-y-3">
            <h4 className="text-sm font-semibold tracking-tight text-zinc-900">
              Entity resolutions
            </h4>
            {draft.entitySuggestions.length === 0 ? (
              <p className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
                No entity suggestions for this event.
              </p>
            ) : (
              draft.entitySuggestions.map((suggestion) => (
                <SuggestionResolutionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  state={reviewState.resolutionsBySuggestionId[suggestion.id]}
                  onChange={(nextState) =>
                    onUpdate((current) => ({
                      ...current,
                      resolutionsBySuggestionId: {
                        ...current.resolutionsBySuggestionId,
                        [suggestion.id]: nextState,
                      },
                    }))
                  }
                />
              ))
            )}
          </section>
        </div>
      ) : null}
    </article>
  );
}

function DraftFieldsEditor({
  value,
  onChange,
}: {
  value: TimelineEventFormValues;
  onChange: (value: TimelineEventFormValues) => void;
}) {
  function update<K extends keyof TimelineEventFormValues>(
    key: K,
    nextValue: TimelineEventFormValues[K]
  ) {
    onChange({
      ...value,
      [key]: nextValue,
    });
  }

  return (
    <section className="grid gap-3 md:grid-cols-2">
      <Field label="Title" value={value.title} onChange={(next) => update("title", next)} />
      <Field
        label="Event type"
        value={value.eventType}
        onChange={(next) => update("eventType", next as TimelineEventFormValues["eventType"])}
      />
      <Field label="Start year" value={value.yearStart} onChange={(next) => update("yearStart", next)} />
      <Field label="End year" value={value.yearEnd} onChange={(next) => update("yearEnd", next)} />
      <Field
        label="Display date label"
        value={value.displayDateLabel}
        onChange={(next) => update("displayDateLabel", next)}
      />
      <Field label="Summary" value={value.summary} onChange={(next) => update("summary", next)} />
      <TextField
        label="Description"
        value={value.description}
        onChange={(next) => update("description", next)}
      />
      <TextField
        label="Causes (comma-separated)"
        value={value.causes}
        onChange={(next) => update("causes", next)}
      />
      <TextField
        label="Consequences (comma-separated)"
        value={value.consequences}
        onChange={(next) => update("consequences", next)}
      />
      <TextField
        label="Public wiki summary"
        value={value.publicWikiSummary}
        onChange={(next) => update("publicWikiSummary", next)}
      />
    </section>
  );
}

function DraftLinkEditor({
  allDrafts,
  currentDraftId,
  predecessorDraftIds,
  successorDraftIds,
  onChange,
}: {
  allDrafts: MultiEventBrainDumpEventDraft[];
  currentDraftId: string;
  predecessorDraftIds: string[];
  successorDraftIds: string[];
  onChange: (next: { predecessorDraftIds: string[]; successorDraftIds: string[] }) => void;
}) {
  const options = allDrafts.filter((draft) => draft.draftId !== currentDraftId);

  function toggle(kind: "predecessor" | "successor", draftId: string) {
    const current = kind === "predecessor" ? predecessorDraftIds : successorDraftIds;
    const next = current.includes(draftId)
      ? current.filter((value) => value !== draftId)
      : [...current, draftId];

    onChange({
      predecessorDraftIds: kind === "predecessor" ? next : predecessorDraftIds,
      successorDraftIds: kind === "successor" ? next : successorDraftIds,
    });
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
      <h4 className="text-sm font-semibold tracking-tight text-zinc-900">Cross-event links</h4>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <LinkColumn
          checkedIds={predecessorDraftIds}
          kind="predecessor"
          options={options}
          title="Predecessors"
          onToggle={toggle}
        />
        <LinkColumn
          checkedIds={successorDraftIds}
          kind="successor"
          options={options}
          title="Successors"
          onToggle={toggle}
        />
      </div>
    </section>
  );
}

function LinkColumn({
  checkedIds,
  kind,
  onToggle,
  options,
  title,
}: {
  checkedIds: string[];
  kind: "predecessor" | "successor";
  onToggle: (kind: "predecessor" | "successor", draftId: string) => void;
  options: MultiEventBrainDumpEventDraft[];
  title: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">{title}</p>
      <div className="mt-2 space-y-2">
        {options.length === 0 ? (
          <p className="text-sm text-zinc-500">No other drafts.</p>
        ) : (
          options.map((option) => (
            <label key={`${kind}-${option.draftId}`} className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={checkedIds.includes(option.draftId)}
                onChange={() => onToggle(kind, option.draftId)}
              />
              {option.prefill.title || option.draftId}
            </label>
          ))
        )}
      </div>
    </div>
  );
}

function SuggestionResolutionCard({
  suggestion,
  state,
  onChange,
}: {
  suggestion: BrainDumpEntitySuggestion;
  state: ReviewResolutionState | undefined;
  onChange: (nextState: ReviewResolutionState) => void;
}) {
  const currentState = state ?? {
    action: "",
    linkedId: "",
    touched: false,
  };

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {suggestion.target}
      </p>
      <p className="mt-1 text-sm font-medium text-zinc-900">
        {suggestion.mention || suggestion.suggestedCreateFields.titleOrName}
      </p>
      <p className="mt-1 text-xs text-zinc-600">{suggestion.reason}</p>
      {suggestion.suggestedAction === "ambiguous" ||
      suggestion.suggestedAction === "unresolved" ? (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] leading-5 text-amber-900">
          Choose <span className="font-semibold">Link existing</span> when one of the
          candidates is the same canon record, <span className="font-semibold">Create new</span>{" "}
          when this is new canon, or <span className="font-semibold">Ignore</span> when this
          mention should not create or link anything.
        </p>
      ) : null}
      <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
        <select
          value={currentState.action}
          onChange={(event) =>
            onChange({
              ...currentState,
              action: event.target.value as ReviewResolutionState["action"],
              touched: true,
            })
          }
          className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
        >
          <option value="">Choose action</option>
          <option value="link">Link existing</option>
          <option value="create">Create new</option>
          <option value="ignore">Ignore</option>
        </select>
        {currentState.action === "link" ? (
          <select
            value={currentState.linkedId}
            onChange={(event) =>
              onChange({
                ...currentState,
                linkedId: event.target.value,
                touched: true,
              })
            }
            className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
          >
            <option value="">Choose existing record</option>
            {suggestion.candidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.meta ? `${candidate.label} - ${candidate.meta}` : candidate.label}
              </option>
            ))}
          </select>
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
            {currentState.action === "create"
              ? `Create: ${suggestion.suggestedCreateFields.titleOrName}`
              : currentState.action === "ignore"
                ? "Ignored"
                : `${suggestion.candidates.length} matching candidate(s)`}
          </div>
        )}
      </div>
    </section>
  );
}

function Field({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-zinc-700">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-400"
      />
    </label>
  );
}

function TextField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block md:col-span-2">
      <span className="mb-2 block text-sm font-medium text-zinc-700">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm leading-6 text-zinc-950 outline-none transition focus:border-zinc-400"
      />
    </label>
  );
}

function buildInitialResolutionState(suggestions: BrainDumpEntitySuggestion[]) {
  return Object.fromEntries(
    suggestions.map((suggestion) => {
      if (suggestion.suggestedAction === "link" && suggestion.candidates.length === 1) {
        return [
          suggestion.id,
          {
            action: "link",
            linkedId: suggestion.candidates[0].id,
            touched: true,
          } satisfies ReviewResolutionState,
        ];
      }

      if (suggestion.suggestedAction === "create") {
        return [
          suggestion.id,
          {
            action: "create",
            linkedId: "",
            touched: true,
          } satisfies ReviewResolutionState,
        ];
      }

      if (suggestion.suggestedAction === "ignore") {
        return [
          suggestion.id,
          {
            action: "ignore",
            linkedId: "",
            touched: true,
          } satisfies ReviewResolutionState,
        ];
      }

      return [
        suggestion.id,
        {
          action: "",
          linkedId: "",
          touched: false,
        } satisfies ReviewResolutionState,
      ];
    })
  );
}

function mergeDraftValuesForApply(
  prefill: TimelineEventFormValues,
  draftValues: TimelineEventFormValues
): TimelineEventFormValues {
  return {
    ...prefill,
    ...draftValues,
    chronologyOrder: draftValues.chronologyOrder.trim() || prefill.chronologyOrder,
    dayEnd: draftValues.dayEnd.trim() || prefill.dayEnd,
    dayStart: draftValues.dayStart.trim() || prefill.dayStart,
    monthEnd: draftValues.monthEnd.trim() || prefill.monthEnd,
    monthStart: draftValues.monthStart.trim() || prefill.monthStart,
    yearEnd: draftValues.yearEnd.trim() || prefill.yearEnd,
    yearStart: draftValues.yearStart.trim() || prefill.yearStart,
  };
}

function getUnresolvedCount(
  suggestions: BrainDumpEntitySuggestion[],
  resolutionsBySuggestionId: Record<string, ReviewResolutionState>
) {
  return suggestions.reduce((count, suggestion) => {
    const state = resolutionsBySuggestionId[suggestion.id];

    if (!state || !state.action) {
      return count + 1;
    }

    if (state.action === "link" && !state.linkedId) {
      return count + 1;
    }

    if (
      (suggestion.suggestedAction === "ambiguous" ||
        suggestion.suggestedAction === "unresolved") &&
      !state.touched
    ) {
      return count + 1;
    }

    return count;
  }, 0);
}

function getDraftAttentionItems(
  draft: MultiEventBrainDumpEventDraft,
  reviewState: DraftReviewState | undefined,
  unresolvedCount: number
) {
  const items: string[] = [];

  if (reviewState?.skipped) {
    items.push("Skipped");
  }

  if (unresolvedCount > 0) {
    items.push(`${unresolvedCount} needs review`);
  }

  if (draft.warnings.length > 0) {
    items.push(`${draft.warnings.length} AI note${draft.warnings.length === 1 ? "" : "s"}`);
  }

  const normalizedValues = normalizeTimelineEventFormValues(reviewState?.draftValues ?? draft.prefill);
  const validation = validateNormalizedTimelineEventFormValues(normalizedValues);

  if (validation.errors.length > 0 && !reviewState?.skipped) {
    items.push(`${validation.errors.length} field issue${validation.errors.length === 1 ? "" : "s"}`);
  }

  return items;
}

function extractQuestionLikeNoteLines(rawText: string) {
  const text = String(rawText ?? "").trim();

  if (!text) {
    return [];
  }

  const lines = text
    .split(/\n+/g)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.filter((line) => {
    const normalized = line.toLowerCase();
    return (
      normalized.includes("?") ||
      normalized.includes("does this work") ||
      normalized.startsWith("question:") ||
      normalized.includes("open question")
    );
  });
}

function buildResolutions(
  suggestions: BrainDumpEntitySuggestion[],
  resolutionsBySuggestionId: Record<string, ReviewResolutionState>
) {
  const resolutions: BrainDumpResolution[] = [];

  for (const suggestion of suggestions) {
    const state = resolutionsBySuggestionId[suggestion.id];

    if (!state || !state.action) {
      continue;
    }

    const resolution: BrainDumpResolution = {
      action: state.action,
      suggestionId: suggestion.id,
      target: suggestion.target,
    };

    if (state.action === "link") {
      resolution.linkedId = state.linkedId;
    }

    resolutions.push(resolution);
  }

  return resolutions;
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

async function buildInsertionValidationItem({
  activeProjectId,
  boundaryEventIds,
  uid,
}: {
  activeProjectId: string;
  boundaryEventIds: {
    nextEventId: string | null;
    previousEventId: string | null;
  };
  uid: string;
}): Promise<TimelineLayoutInsertionItem | null> {
  const [previousEvent, nextEvent] = await Promise.all([
    boundaryEventIds.previousEventId
      ? getTimelineEventById(uid, activeProjectId, boundaryEventIds.previousEventId)
      : Promise.resolve(null),
    boundaryEventIds.nextEventId
      ? getTimelineEventById(uid, activeProjectId, boundaryEventIds.nextEventId)
      : Promise.resolve(null),
  ]);

  if (!previousEvent && !nextEvent) {
    return null;
  }

  const previousBoundary = getInsertionBoundaryChronologyParts(previousEvent, "end");
  const nextBoundary = getInsertionBoundaryChronologyParts(nextEvent, "start");

  return {
    kind: "notch",
    id: "multi-event-validation",
    label: "Insert between events",
    helperText: "",
    fallbackYear: "",
    previousEventId: previousEvent?.id ?? null,
    nextEventId: nextEvent?.id ?? null,
    previousEventTitle: previousEvent?.title ?? null,
    nextEventTitle: nextEvent?.title ?? null,
    prefilledYearStart: "",
    prefilledMonthStart: "",
    prefilledDayStart: "",
    prefilledYearEnd: "",
    prefilledMonthEnd: "",
    prefilledDayEnd: "",
    previousBoundaryYear: previousBoundary.year,
    previousBoundaryMonth: previousBoundary.month,
    previousBoundaryDay: previousBoundary.day,
    nextBoundaryYear: nextBoundary.year,
    nextBoundaryMonth: nextBoundary.month,
    nextBoundaryDay: nextBoundary.day,
  };
}

function buildInitialDraftReviewState(
  drafts: MultiEventBrainDumpEventDraft[],
  savedDraftStateById: Record<string, DraftReviewState> | null
) {
  return Object.fromEntries(
    drafts.map((draft) => {
      const savedDraftState = savedDraftStateById?.[draft.draftId];

      if (savedDraftState) {
        return [
          draft.draftId,
          cloneDraftReviewState(savedDraftState),
        ] as const;
      }

      return [
        draft.draftId,
        {
          draftValues: draft.prefill,
          predecessorDraftIds: [...draft.suggestedPredecessorDraftIds],
          resolutionsBySuggestionId: buildInitialResolutionState(draft.entitySuggestions),
          skipped: false,
          successorDraftIds: [...draft.suggestedSuccessorDraftIds],
        } satisfies DraftReviewState,
      ] as const;
    })
  ) as Record<string, DraftReviewState>;
}

function cloneDraftReviewState(state: DraftReviewState): DraftReviewState {
  return {
    draftValues: state.draftValues,
    predecessorDraftIds: [...state.predecessorDraftIds],
    resolutionsBySuggestionId: Object.fromEntries(
      Object.entries(state.resolutionsBySuggestionId).map(([suggestionId, resolution]) => [
        suggestionId,
        { ...resolution },
      ])
    ),
    skipped: state.skipped,
    successorDraftIds: [...state.successorDraftIds],
  };
}

function buildReviewSnapshotKey(
  jobId: string,
  selectedDraftId: string | null,
  draftStateById: Record<string, DraftReviewState>,
  status: "pending" | "applied"
) {
  return JSON.stringify({
    draftStateById,
    jobId,
    selectedDraftId,
    status,
  });
}

function serializeJobReviewState({
  appliedAt,
  draftStateById,
  savedAt,
  selectedDraftId,
  status,
}: {
  appliedAt: string | null;
  draftStateById: Record<string, DraftReviewState>;
  savedAt: string;
  selectedDraftId: string | null;
  status: "pending" | "applied";
}) {
  return {
    appliedAt,
    draftStateById,
    savedAt,
    selectedDraftId,
    status,
  };
}
