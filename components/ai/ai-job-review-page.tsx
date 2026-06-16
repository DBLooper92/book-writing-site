"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { useActiveProject } from "@/hooks/use-active-project";
import { createTimelineEventForProject, updateTimelineEventForProject } from "@/lib/data/timeline-events";
import { applyAiDraftResolutionsToTimelineValues } from "@/lib/timeline/ai-draft-apply";
import { getInsertionBoundaryEventIds } from "@/lib/timeline/insertion-anchors";
import { rewireTimelineInsertionBoundaryLinksForProject } from "@/lib/timeline/insertion-links-runtime";
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

type AiJobReviewPageProps = {
  jobId: string;
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

export function AiJobReviewPage({ jobId }: AiJobReviewPageProps) {
  const { activeProject, activeProjectId, loading: projectLoading, uid, user } = useActiveProject();
  const [job, setJob] = useState<AiMultiEventJobRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [draftStateById, setDraftStateById] = useState<Record<string, DraftReviewState>>({});
  const [applying, setApplying] = useState(false);
  const [applyReport, setApplyReport] = useState<MultiEventApplyReport | null>(null);
  const [postApplyWarnings, setPostApplyWarnings] = useState<string[]>([]);
  const initializedJobIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadJob() {
      try {
        const nextJob = await window.bookBible.ai.getJobStatus(jobId);

        if (cancelled) {
          return;
        }

        setJob(nextJob);
        setError(null);
      } catch (nextError) {
        if (cancelled) {
          return;
        }

        setError(nextError instanceof Error ? nextError.message : "Unable to load AI job.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    setLoading(true);
    void loadJob();
    const unsubscribe = window.bookBible.ai.subscribeJobs(() => {
      void loadJob();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [jobId]);

  const drafts = job?.result?.events ?? [];

  useEffect(() => {
    if (!job || job.id !== jobId || !job.result?.events) {
      return;
    }

    if (initializedJobIdRef.current === job.id) {
      return;
    }

    const nextState = Object.fromEntries(
      job.result.events.map((draft) => {
        const reviewState: DraftReviewState = {
          draftValues: draft.prefill,
          predecessorDraftIds: [...draft.suggestedPredecessorDraftIds],
          resolutionsBySuggestionId: buildInitialResolutionState(draft.entitySuggestions),
          skipped: false,
          successorDraftIds: [...draft.suggestedSuccessorDraftIds],
        };

        return [draft.draftId, reviewState] as const;
      })
    );

    setDraftStateById(nextState);
    setSelectedDraftId(job.result.events[0]?.draftId ?? null);
    setApplyReport(null);
    setPostApplyWarnings([]);
    initializedJobIdRef.current = job.id;
  }, [job, jobId]);

  const selectedDraftIndex = useMemo(() => {
    if (!selectedDraftId) {
      return 0;
    }

    const index = drafts.findIndex((draft) => draft.draftId === selectedDraftId);
    return index < 0 ? 0 : index;
  }, [drafts, selectedDraftId]);

  const selectedDraft = drafts[selectedDraftIndex] ?? null;
  const selectedState = selectedDraft ? draftStateById[selectedDraft.draftId] : null;

  const unresolvedCount = useMemo(() => {
    if (!selectedDraft || !selectedState || selectedState.skipped) {
      return 0;
    }

    return getUnresolvedCount(selectedDraft.entitySuggestions, selectedState.resolutionsBySuggestionId);
  }, [selectedDraft, selectedState]);

  function updateSelectedDraft(
    updater: (current: DraftReviewState) => DraftReviewState
  ) {
    if (!selectedDraft) {
      return;
    }

    setDraftStateById((current) => {
      const existing = current[selectedDraft.draftId];

      if (!existing) {
        return current;
      }

      return {
        ...current,
        [selectedDraft.draftId]: updater(existing),
      };
    });
  }

  async function handleApplyReviewedEvents() {
    if (!uid || !activeProjectId) {
      setError("A signed-in user and active project are required.");
      return;
    }

    if (!job) {
      setError("The AI job is no longer available.");
      return;
    }

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
    setApplying(true);
    setError(null);

    try {
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
            brainDumpText: "",
            preview: {
              entitySuggestions: draft.entitySuggestions,
              prefill: mergedDraftValues,
              warnings: [],
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
            valuesWithResolvedEntities
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

        try {
          await updateTimelineEventForProject(uid, activeProjectId, success.createdTimelineEventId, {
            ...entry.values,
            predecessorEventIds,
            successorEventIds,
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
    } finally {
      setApplying(false);
    }
  }

  return (
    <PageShell
      eyebrow="AI Jobs"
      title="Review Multi-Event BrainDump Job"
      description="Review one extracted event at a time, resolve links/creates, optionally skip drafts, then apply with per-event commit semantics."
    >
      {!user ? (
        <StateCard>Sign in first to review AI jobs.</StateCard>
      ) : projectLoading ? (
        <StateCard>Loading active project...</StateCard>
      ) : !activeProjectId || !activeProject ? (
        <StateCard>No active project selected.</StateCard>
      ) : loading ? (
        <StateCard>Loading job...</StateCard>
      ) : error ? (
        <StateCard tone="error">{error}</StateCard>
      ) : !job ? (
        <StateCard tone="error">Job not found.</StateCard>
      ) : (
        <section className="space-y-4">
          <article className="rounded-3xl border border-zinc-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  {job.id}
                </p>
                <h2 className="mt-2 text-lg font-semibold tracking-tight text-zinc-950">{job.title}</h2>
                <p className="mt-2 text-sm text-zinc-600">
                  Status: <span className="font-medium">{job.status}</span>
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  Chunks: {job.progress.completedChunks}/{job.progress.totalChunks} ({job.progress.currentStep})
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  Attempts: {job.progress.totalAttempts ?? 0} · Retries: {job.progress.totalRetries ?? 0}
                </p>
                {job.failureCategory ? (
                  <p className="mt-1 text-sm text-zinc-600">Failure category: {job.failureCategory}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/ai-jobs"
                  className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
                >
                  Back to jobs
                </Link>
                {(job.status === "queued" || job.status === "running") ? (
                  <button
                    type="button"
                    onClick={() => void window.bookBible.ai.cancelJob(job.id)}
                    className="inline-flex h-10 items-center justify-center rounded-full border border-red-200 px-4 text-sm font-medium text-red-700 transition hover:bg-red-50"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </div>
            {job.errorMessage ? (
              <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {job.errorMessage}
              </p>
            ) : null}
            {job.warnings.length > 0 ? (
              <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {job.warnings.join(" ")}
              </p>
            ) : null}
          </article>

          {job.status !== "completed" ? (
            <StateCard>Job is not complete yet. Stay on this page for live updates or come back from AI Jobs later.</StateCard>
          ) : drafts.length === 0 ? (
            <StateCard>No event drafts were extracted from this job.</StateCard>
          ) : (
            <>
              <article className="rounded-3xl border border-zinc-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-700">
                    Event {selectedDraftIndex + 1} of {drafts.length}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDraftId(drafts[Math.max(0, selectedDraftIndex - 1)]?.draftId ?? null)}
                      disabled={selectedDraftIndex === 0}
                      className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-200 px-3 text-xs font-medium text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedState?.skipped && unresolvedCount > 0) {
                          setError(`Resolve ${unresolvedCount} suggestion(s) before moving on, or mark this event skipped.`);
                          return;
                        }

                        setError(null);
                        setSelectedDraftId(
                          drafts[Math.min(drafts.length - 1, selectedDraftIndex + 1)]?.draftId ?? null
                        );
                      }}
                      disabled={selectedDraftIndex >= drafts.length - 1}
                      className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-200 px-3 text-xs font-medium text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>

                {selectedDraft && selectedState ? (
                  <div className="mt-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold tracking-tight text-zinc-900">{selectedDraft.draftId}</p>
                      <button
                        type="button"
                        onClick={() =>
                          updateSelectedDraft((current) => ({
                            ...current,
                            skipped: !current.skipped,
                          }))
                        }
                        className={`inline-flex h-9 items-center justify-center rounded-full px-3 text-xs font-semibold uppercase tracking-[0.14em] ${
                          selectedState.skipped
                            ? "bg-zinc-950 text-white"
                            : "border border-zinc-200 text-zinc-700"
                        }`}
                      >
                        {selectedState.skipped ? "Skipped" : "Mark skipped"}
                      </button>
                    </div>

                    <DraftFieldsEditor
                      value={selectedState.draftValues}
                      onChange={(nextValues) =>
                        updateSelectedDraft((current) => ({
                          ...current,
                          draftValues: nextValues,
                        }))
                      }
                    />

                    <DraftLinkEditor
                      allDrafts={drafts}
                      currentDraftId={selectedDraft.draftId}
                      predecessorDraftIds={selectedState.predecessorDraftIds}
                      successorDraftIds={selectedState.successorDraftIds}
                      onChange={(next) =>
                        updateSelectedDraft((current) => ({
                          ...current,
                          predecessorDraftIds: next.predecessorDraftIds,
                          successorDraftIds: next.successorDraftIds,
                        }))
                      }
                    />

                    <section className="space-y-3">
                      <h3 className="text-sm font-semibold tracking-tight text-zinc-900">
                        Entity resolutions
                      </h3>
                      {selectedDraft.entitySuggestions.length === 0 ? (
                        <p className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
                          No entity suggestions for this event.
                        </p>
                      ) : (
                        selectedDraft.entitySuggestions.map((suggestion) => (
                          <SuggestionResolutionCard
                            key={suggestion.id}
                            suggestion={suggestion}
                            state={selectedState.resolutionsBySuggestionId[suggestion.id]}
                            onChange={(nextState) =>
                              updateSelectedDraft((current) => ({
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

                    {!selectedState.skipped && unresolvedCount > 0 ? (
                      <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        Resolve {unresolvedCount} suggestion(s) or mark this event skipped.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </article>

              <article className="rounded-3xl border border-zinc-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold tracking-tight text-zinc-950">Apply reviewed events</h3>
                    <p className="mt-2 text-sm text-zinc-600">
                      This writes records now. Saves are per event: successes remain even if later events fail.
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
              </article>
            </>
          )}

          {applyReport ? (
            <article className="rounded-3xl border border-zinc-200 bg-white p-5">
              <h3 className="text-base font-semibold tracking-tight text-zinc-950">Apply report</h3>
              <p className="mt-2 text-sm text-zinc-600">
                Created {applyReport.success.length}, failed {applyReport.failed.length}, skipped {applyReport.skipped.length}.
              </p>
              {applyReport.success.length > 0 ? (
                <ul className="mt-3 space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  {applyReport.success.map((entry) => (
                    <li key={entry.draftId}>
                      {entry.draftId} {"->"} {entry.createdTimelineEventId}
                    </li>
                  ))}
                </ul>
              ) : null}
              {applyReport.failed.length > 0 ? (
                <ul className="mt-3 space-y-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {applyReport.failed.map((entry) => (
                    <li key={entry.draftId}>
                      {entry.draftId}: {entry.error}
                    </li>
                  ))}
                </ul>
              ) : null}
              {applyReport.skipped.length > 0 ? (
                <ul className="mt-3 space-y-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
                  {applyReport.skipped.map((entry) => (
                    <li key={entry.draftId}>
                      {entry.draftId}: {entry.reason}
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
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/timeline"
                  className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
                >
                  Open timeline
                </Link>
                <Link
                  href="/ai-jobs"
                  className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
                >
                  Back to jobs
                </Link>
              </div>
            </article>
          ) : null}
        </section>
      )}
    </PageShell>
  );
}

function DraftFieldsEditor({
  value,
  onChange,
}: {
  value: TimelineEventFormValues;
  onChange: (value: TimelineEventFormValues) => void;
}) {
  function update<K extends keyof TimelineEventFormValues>(key: K, nextValue: TimelineEventFormValues[K]) {
    onChange({
      ...value,
      [key]: nextValue,
    });
  }

  return (
    <section className="grid gap-3 md:grid-cols-2">
      <Field label="Title" value={value.title} onChange={(next) => update("title", next)} />
      <Field label="Event type" value={value.eventType} onChange={(next) => update("eventType", next as TimelineEventFormValues["eventType"])} />
      <Field label="Start year" value={value.yearStart} onChange={(next) => update("yearStart", next)} />
      <Field label="End year" value={value.yearEnd} onChange={(next) => update("yearEnd", next)} />
      <Field label="Display date label" value={value.displayDateLabel} onChange={(next) => update("displayDateLabel", next)} />
      <Field label="Summary" value={value.summary} onChange={(next) => update("summary", next)} />
      <TextField label="Description" value={value.description} onChange={(next) => update("description", next)} />
      <TextField label="Causes (comma-separated)" value={value.causes} onChange={(next) => update("causes", next)} />
      <TextField label="Consequences (comma-separated)" value={value.consequences} onChange={(next) => update("consequences", next)} />
      <TextField label="Public wiki summary" value={value.publicWikiSummary} onChange={(next) => update("publicWikiSummary", next)} />
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
      <h3 className="text-sm font-semibold tracking-tight text-zinc-900">Cross-event links</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Predecessors</p>
          <div className="mt-2 space-y-2">
            {options.map((option) => (
              <label key={`pred-${option.draftId}`} className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={predecessorDraftIds.includes(option.draftId)}
                  onChange={() => toggle("predecessor", option.draftId)}
                />
                {option.prefill.title || option.draftId}
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Successors</p>
          <div className="mt-2 space-y-2">
            {options.map((option) => (
              <label key={`succ-${option.draftId}`} className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={successorDraftIds.includes(option.draftId)}
                  onChange={() => toggle("successor", option.draftId)}
                />
                {option.prefill.title || option.draftId}
              </label>
            ))}
          </div>
        </div>
      </div>
    </section>
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
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">{suggestion.target}</p>
      <p className="mt-1 text-sm font-medium text-zinc-900">
        {suggestion.mention || suggestion.suggestedCreateFields.titleOrName}
      </p>
      <p className="mt-1 text-xs text-zinc-600">{suggestion.reason}</p>
      {(suggestion.suggestedAction === "ambiguous" || suggestion.suggestedAction === "unresolved") ? (
        <p className="mt-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-900">
          AI could not resolve this mention confidently. Choose link/create/ignore explicitly.
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
    yearStart: draftValues.yearStart.trim() || prefill.yearStart,
    yearEnd: draftValues.yearEnd.trim() || prefill.yearEnd,
    chronologyOrder: draftValues.chronologyOrder.trim() || prefill.chronologyOrder,
    monthStart: draftValues.monthStart.trim() || prefill.monthStart,
    monthEnd: draftValues.monthEnd.trim() || prefill.monthEnd,
    dayStart: draftValues.dayStart.trim() || prefill.dayStart,
    dayEnd: draftValues.dayEnd.trim() || prefill.dayEnd,
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

    if ((suggestion.suggestedAction === "ambiguous" || suggestion.suggestedAction === "unresolved") && !state.touched) {
      return count + 1;
    }

    return count;
  }, 0);
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

function StateCard({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "error";
}) {
  return (
    <section
      className={`rounded-3xl border p-6 text-sm leading-6 ${
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-zinc-300 bg-zinc-50 text-zinc-600"
      }`}
    >
      {children}
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
      <span className="mb-1 block text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
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
      <span className="mb-1 block text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[5rem] w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
      />
    </label>
  );
}
