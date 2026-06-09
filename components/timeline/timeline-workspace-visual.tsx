"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { TimelineBrainDumpJobReview } from "@/components/timeline/timeline-brain-dump-job-review";
import { TimelineCreateModeLightbox } from "@/components/timeline/timeline-create-mode-lightbox";
import { TimelineEventComposerSheet } from "@/components/timeline/timeline-event-composer-sheet";
import { TimelineEventDetailLightbox } from "@/components/timeline/timeline-event-detail-lightbox";
import { TimelineWorkspaceControls } from "@/components/timeline/timeline-workspace-controls";
import { TimelineWorkspaceEventCard } from "@/components/timeline/timeline-workspace-event-card";
import { useTimelineFormOptions } from "@/hooks/use-timeline-form-options";
import {
  deleteTimelineEventForProject,
  updateTimelineEventSummaryAndDescriptionForProject,
} from "@/lib/data/timeline-events";
import {
  buildTimelineLayoutModel,
  type TimelineLayoutEventItem,
  type TimelineLayoutGapItem,
  type TimelineLayoutInsertionItem,
} from "@/lib/timeline/layout";
import type { TimelineReferenceOption } from "@/lib/timeline/references";
import {
  loadPendingSingleReviewMap,
  savePendingSingleReviewMap,
} from "@/lib/timeline/pending-single-review";
import {
  buildTimelineCreateHref,
  buildTimelineCreateInitialValuesFromSearchParams,
  clearTimelineCreateSearchParams,
  getTimelineCreateMode,
  hasTimelineCreateSearchParams,
} from "@/lib/timeline/create-route";
import { formatDetailedTimelineEventRange } from "@/lib/timeline/workspace";
import {
  type TimelineWorkspaceFilters,
  type TimelineWorkspaceStats,
} from "@/lib/timeline/workspace";
import type { TimelineWorkspaceViewMode } from "@/components/timeline/timeline-workspace-controls";
import type {
  AiMultiEventJobRecord,
  AiTimelineCreateDraftState,
  TimelineBrainDumpInsertionContext,
  TimelineSingleEventBrainDumpReviewState,
} from "@/types/ai-brain-dump";
import type { TimelineEvent, TimelineEventFormValues } from "@/types/timeline-event";

type TimelineWorkspaceVisualProps = {
  activeProjectId: string;
  activeProjectTitle: string;
  filters: TimelineWorkspaceFilters;
  hasActiveFilters: boolean;
  onChange: (updates: Partial<TimelineWorkspaceFilters>) => void;
  onReset: () => void;
  onRefreshTimelineEvents: () => Promise<void>;
  stats: TimelineWorkspaceStats;
  timelineEvents: TimelineEvent[];
  uid: string;
};

export function TimelineWorkspaceVisual({
  activeProjectId,
  activeProjectTitle,
  filters,
  hasActiveFilters,
  onChange,
  onReset,
  onRefreshTimelineEvents,
  stats,
  timelineEvents,
  uid,
}: TimelineWorkspaceVisualProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filtersPinned, setFiltersPinned] = useState(false);
  const [viewMode, setViewMode] = useState<TimelineWorkspaceViewMode>("timeline");
  const [requestedSelectedEventId, setRequestedSelectedEventId] = useState<string | null>(null);
  const [viewerEventId, setViewerEventId] = useState<string | null>(null);
  const [localComposerState, setLocalComposerState] = useState<
    | {
        aiDraftState?: AiTimelineCreateDraftState | null;
        initialValuesOverride?: TimelineEventFormValues | null;
        insertionItem: TimelineLayoutInsertionItem | null;
        mode: "create";
        source: "local";
      }
    | { mode: "edit"; source: "local"; timelineEventId: string }
    | null
  >(null);
  const [localCreateFlowState, setLocalCreateFlowState] = useState<{
    createMode: "aiMulti" | "aiSingle" | "chooser" | "manual";
    insertionContext: TimelineBrainDumpInsertionContext | null;
    initialValuesOverride?: TimelineEventFormValues | null;
    insertionItem: TimelineLayoutInsertionItem | null;
    pendingSingleReviewState?: TimelineSingleEventBrainDumpReviewState | null;
    source: "local" | "url";
  } | null>(null);
  const [activeBrainDumpJob, setActiveBrainDumpJob] = useState<{
    insertionItemId: string;
    job: AiMultiEventJobRecord | null;
    jobId: string;
  } | null>(null);
  const [restoredBrainDumpJobsByInsertionItemId, setRestoredBrainDumpJobsByInsertionItemId] =
    useState<Record<string, AiMultiEventJobRecord>>({});
  const [pendingSingleReviewByInsertionItemId, setPendingSingleReviewByInsertionItemId] =
    useState<Record<string, TimelineSingleEventBrainDumpReviewState>>({});
  const pendingSingleReviewHydratedRef = useRef(false);
  const pendingSingleReviewLoadTokenRef = useRef(0);
  const visibleRestoredBrainDumpJobsByInsertionItemId = useMemo(
    () => (uid && activeProjectId ? restoredBrainDumpJobsByInsertionItemId : {}),
    [activeProjectId, restoredBrainDumpJobsByInsertionItemId, uid]
  );
  const visiblePendingSingleReviewByInsertionItemId = useMemo(
    () => (uid && activeProjectId ? pendingSingleReviewByInsertionItemId : {}),
    [activeProjectId, pendingSingleReviewByInsertionItemId, uid]
  );
  const eventRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const insertionRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const knownTimelineEventIds = new Set(timelineEvents.map((timelineEvent) => timelineEvent.id));
  const formOptions = useTimelineFormOptions();
  const layout = buildTimelineLayoutModel(timelineEvents);
  const orderedTimelineEvents = layout.items
    .filter((item): item is TimelineLayoutEventItem => item.kind === "event")
    .map((item) => item.timelineEvent);
  const requestedCreateComposer = hasTimelineCreateSearchParams(searchParams);
  const searchParamsKey = searchParams.toString();
  const requestedCreateFlowState = requestedCreateComposer
    ? {
        createMode: getTimelineCreateMode(searchParams),
        insertionContext: null,
        initialValuesOverride: buildTimelineCreateInitialValuesFromSearchParams(searchParams),
        insertionItem: null,
        pendingSingleReviewState: null,
        source: "url" as const,
      }
    : null;
  const createFlowState = requestedCreateFlowState ?? localCreateFlowState;
  const composerState = localComposerState;
  const selectedEventId =
    requestedSelectedEventId &&
    timelineEvents.some((timelineEvent) => timelineEvent.id === requestedSelectedEventId)
      ? requestedSelectedEventId
      : timelineEvents[0]?.id ?? null;
  const viewingTimelineEvent =
    viewerEventId && timelineEvents.some((timelineEvent) => timelineEvent.id === viewerEventId)
      ? timelineEvents.find((timelineEvent) => timelineEvent.id === viewerEventId) ?? null
      : null;
  const editingTimelineEvent =
    composerState?.mode === "edit"
      ? timelineEvents.find((timelineEvent) => timelineEvent.id === composerState.timelineEventId) ??
        null
      : null;
  const availableReferenceMaps =
    !formOptions.loading && !formOptions.error ? formOptions.referenceMaps : null;
  const availableReferenceSets =
    !formOptions.loading && !formOptions.error ? formOptions.referenceSets : null;
  const bookLabelsById = useMemo(
    () => new Map(formOptions.bookOptions.map((option) => [option.value, option.label] as const)),
    [formOptions.bookOptions]
  );
  const chapterLabelsById = useMemo(
    () =>
      new Map(formOptions.chapterOptions.map((option) => [option.value, option.label] as const)),
    [formOptions.chapterOptions]
  );
  const visibleChapterFilterOptions = useMemo(
    () => buildVisibleChapterFilterOptions(formOptions.chapterOptions, filters.bookIds),
    [filters.bookIds, formOptions.chapterOptions]
  );
  const pendingInsertionItemIds = useMemo(() => {
    const pendingIds = new Set([
      ...Object.keys(visibleRestoredBrainDumpJobsByInsertionItemId),
      ...Object.keys(visiblePendingSingleReviewByInsertionItemId),
    ]);

    return layout.items
      .filter((item): item is TimelineLayoutInsertionItem => item.kind === "notch")
      .map((item) => item.id)
      .filter((itemId) => pendingIds.has(itemId));
  }, [layout.items, visiblePendingSingleReviewByInsertionItemId, visibleRestoredBrainDumpJobsByInsertionItemId]);
  const firstPendingInsertionItemId = pendingInsertionItemIds[0] ?? null;

  const activeBrainDumpJobId = activeBrainDumpJob?.jobId ?? null;

  useEffect(() => {
    if (!activeBrainDumpJobId) {
      return;
    }

    let cancelled = false;
    const jobId = activeBrainDumpJobId;

    async function loadJob() {
      try {
        const nextJob = await window.bookBible.ai.getJobStatus(jobId);

        if (!cancelled) {
          setActiveBrainDumpJob((current) =>
            current && current.jobId === jobId
              ? {
                  ...current,
                  job: nextJob,
                }
              : current
          );
        }
      } catch {
        // The timeline keeps the visual lock until the next jobs change event or refresh.
      }
    }

    void loadJob();
    const unsubscribe = window.bookBible.ai.subscribeJobs(() => {
      void loadJob();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [activeBrainDumpJobId]);

  useEffect(() => {
    if (!uid || !activeProjectId) {
      return;
    }

    let cancelled = false;

    async function loadPersistedBrainDumpJobs() {
      try {
        const jobSummaries = await window.bookBible.ai.listJobs();
        const jobRecords = await Promise.all(
          jobSummaries.map((summary) => window.bookBible.ai.getJobStatus(summary.id))
        );

        if (cancelled) {
          return;
        }

        const nextJobsByInsertionItemId = Object.fromEntries(
          jobRecords
            .filter(
              (job): job is AiMultiEventJobRecord => {
                if (!job) {
                  return false;
                }

                const insertionItemId = job.input?.timelineInsertionItemId;

                return (
                  typeof insertionItemId === "string" &&
                  insertionItemId.trim().length > 0 &&
                  (job.status === "queued" ||
                    job.status === "running" ||
                    job.status === "failed" ||
                    (job.status === "completed" &&
                      Boolean(job.result?.events?.length) &&
                      job.reviewState?.status !== "applied"))
                );
              }
            )
            .map((job) => [job.input!.timelineInsertionItemId!, job])
        ) as Record<string, AiMultiEventJobRecord>;

        setRestoredBrainDumpJobsByInsertionItemId(nextJobsByInsertionItemId);
      } catch {
        if (!cancelled) {
          setRestoredBrainDumpJobsByInsertionItemId({});
        }
      }
    }

    void loadPersistedBrainDumpJobs();
    const unsubscribeJobs = window.bookBible.ai.subscribeJobs(() => {
      void loadPersistedBrainDumpJobs();
    });

    return () => {
      cancelled = true;
      unsubscribeJobs();
    };
  }, [activeProjectId, uid]);

  useEffect(() => {
    pendingSingleReviewLoadTokenRef.current += 1;
    const loadToken = pendingSingleReviewLoadTokenRef.current;
    pendingSingleReviewHydratedRef.current = false;

    const frame = window.requestAnimationFrame(() => {
      if (pendingSingleReviewLoadTokenRef.current !== loadToken) {
        return;
      }

      if (!uid || !activeProjectId) {
        setPendingSingleReviewByInsertionItemId({});
        pendingSingleReviewHydratedRef.current = false;
        return;
      }

      setPendingSingleReviewByInsertionItemId(loadPendingSingleReviewMap(activeProjectId));
      pendingSingleReviewHydratedRef.current = true;
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [activeProjectId, uid]);

  useEffect(() => {
    if (!uid || !activeProjectId || !pendingSingleReviewHydratedRef.current) {
      return;
    }

    savePendingSingleReviewMap(activeProjectId, pendingSingleReviewByInsertionItemId);
  }, [activeProjectId, pendingSingleReviewByInsertionItemId, uid]);

  function registerEventRef(eventId: string, node: HTMLDivElement | null) {
    if (node) {
      eventRefs.current.set(eventId, node);
      return;
    }

    eventRefs.current.delete(eventId);
  }

  function registerInsertionRef(insertionItemId: string, node: HTMLDivElement | null) {
    if (node) {
      insertionRefs.current.set(insertionItemId, node);
      return;
    }

    insertionRefs.current.delete(insertionItemId);
  }

  function focusEvent(eventId: string) {
    setRequestedSelectedEventId(eventId);
    eventRefs.current.get(eventId)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  function focusPendingInsertionItem(insertionItemId: string) {
    insertionRefs.current.get(insertionItemId)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  function openViewer(eventId: string) {
    setRequestedSelectedEventId(eventId);
    setViewerEventId(eventId);
  }

  function openEditComposer(eventId: string) {
    setRequestedSelectedEventId(eventId);
    setViewerEventId(null);
    setLocalComposerState({
      mode: "edit",
      source: "local",
      timelineEventId: eventId,
    });
  }

  async function handleSaved(timelineEventId: string) {
    setRequestedSelectedEventId(timelineEventId);
    await onRefreshTimelineEvents();
    closeComposer();
  }

  async function handleDeleteTimelineEvent(timelineEvent: TimelineEvent) {
    try {
      await deleteTimelineEventForProject(uid, activeProjectId, timelineEvent.id);
      setViewerEventId(null);

      if (requestedSelectedEventId === timelineEvent.id) {
        setRequestedSelectedEventId(null);
      }

      await onRefreshTimelineEvents();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to delete this timeline event.";
      window.alert(message);
    }
  }

  async function handleUpdateEventCardSummaryDescription(
    timelineEventId: string,
    payload: {
      summary: string;
      description: string;
    }
  ) {
    await updateTimelineEventSummaryAndDescriptionForProject(
      uid,
      activeProjectId,
      timelineEventId,
      payload
    );
    await onRefreshTimelineEvents();
  }

  function closeComposer() {
    setLocalComposerState(null);
  }

  function clearCreateQueryIfNeeded(source: "local" | "url") {
    if (source !== "url") {
      return;
    }

    const nextSearchParams = clearTimelineCreateSearchParams(new URLSearchParams(searchParamsKey));
    const nextQueryString = nextSearchParams.toString();
    router.replace(nextQueryString ? `${pathname}?${nextQueryString}` : pathname, {
      scroll: false,
    });
  }

  function closeCreateFlow() {
    if (!createFlowState) {
      return;
    }

    const source = createFlowState.source;
    setLocalCreateFlowState(null);
    clearCreateQueryIfNeeded(source);
  }

  function openCreateComposerFromFlow(
    initialValuesOverride: TimelineEventFormValues | null,
    aiDraftState?: AiTimelineCreateDraftState | null
  ) {
    const source = createFlowState?.source ?? "local";
    setLocalCreateFlowState(null);
    clearCreateQueryIfNeeded(source);
    setLocalComposerState({
      aiDraftState: aiDraftState ?? null,
      initialValuesOverride,
      insertionItem: createFlowState?.insertionItem ?? null,
      mode: "create",
      source: "local",
    });
  }

  async function handleMultiBrainDumpJobStarted(jobId: string) {
    const insertionItemId = createFlowState?.insertionItem?.id;

    if (!insertionItemId) {
      return;
    }

    const job = await window.bookBible.ai.getJobStatus(jobId);

    setActiveBrainDumpJob({
      insertionItemId,
      job,
      jobId,
    });
  }

  function handlePendingSingleReviewStateChange(
    insertionItemId: string,
    state: TimelineSingleEventBrainDumpReviewState | null
  ) {
    setPendingSingleReviewByInsertionItemId((current) => {
      if (!state) {
        if (!(insertionItemId in current)) {
          return current;
        }

        const next = { ...current };
        delete next[insertionItemId];
        return next;
      }

      return {
        ...current,
        [insertionItemId]: state,
      };
    });
  }

  function openPendingSingleReview(
    insertionItem: TimelineLayoutInsertionItem,
    state: TimelineSingleEventBrainDumpReviewState
  ) {
    const insertionContext = buildInsertionBrainDumpContext(orderedTimelineEvents, insertionItem);

    setLocalCreateFlowState({
      createMode: "aiSingle",
      insertionContext,
      initialValuesOverride: state.initialValues,
      insertionItem,
      source: "local",
      pendingSingleReviewState: state,
    });
  }

  async function handleTimelineBrainDumpApproved() {
    setActiveBrainDumpJob(null);
    await onRefreshTimelineEvents();
  }

  function handleToggleBookFilter(bookId: string) {
    const nextBookIds = toggleTimelineFilterValue(filters.bookIds, bookId);
    const nextChapterIds = pruneChapterFiltersToSelectedBooks(
      filters.chapterIds,
      nextBookIds,
      formOptions.chapterOptions
    );

    onChange({
      bookIds: nextBookIds,
      chapterIds: nextChapterIds,
    });
  }

  function handleToggleChapterFilter(chapterId: string) {
    onChange({
      chapterIds: toggleTimelineFilterValue(filters.chapterIds, chapterId),
    });
  }

  const isScrollMode = viewMode === "scroll";
  const filterBarClassName =
    !isScrollMode && filtersPinned
      ? "xl:sticky xl:top-0 xl:z-20 xl:shadow-[0_18px_45px_-36px_rgba(24,24,27,0.55)]"
      : "";

  return (
    <>
      {isScrollMode ? (
        <section className="flex min-h-[calc(100vh-6rem)] flex-1 flex-col bg-[linear-gradient(180deg,#fcfbf7_0%,#f6f3ec_100%)]">
          <div className={filterBarClassName}>
            <TimelineWorkspaceControls
              filters={filters}
              totalCount={stats.totalEvents}
              visibleCount={stats.visibleEvents}
              hasActiveFilters={hasActiveFilters}
              pinned={filtersPinned}
              viewMode={viewMode}
              onChange={onChange}
              onReset={onReset}
              onTogglePinned={() => setFiltersPinned((current) => !current)}
              onViewModeChange={setViewMode}
            />
          </div>

          <div className="grid flex-1 xl:grid-cols-[19rem_minmax(0,1fr)]">
            <aside className="border-b border-zinc-200 bg-[#fafaf8] xl:border-b-0 xl:border-r xl:shadow-[20px_0_40px_-32px_rgba(24,24,27,0.55)]">
              <div className="flex h-full flex-col px-5 py-5 sm:px-6 xl:min-h-0 xl:overflow-y-auto">
                <div className="border-b border-zinc-200 pb-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Books and chapters
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    Focus the reading stream by the manuscript sources attached to each event.
                  </p>

                  {formOptions.loading ? (
                    <p className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
                      Loading book and chapter filters...
                    </p>
                  ) : formOptions.error ? (
                    <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      Book and chapter filters could not be loaded right now.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-4">
                      <FilterGroup
                        emptyLabel="No books available."
                        items={formOptions.bookOptions}
                        label="Books"
                        selectedIds={filters.bookIds}
                        onToggle={handleToggleBookFilter}
                      />

                      <FilterGroup
                        emptyLabel={
                          filters.bookIds.length > 0
                            ? "No chapters in the selected books."
                            : "No chapters available."
                        }
                        items={visibleChapterFilterOptions}
                        label="Chapters"
                        selectedIds={filters.chapterIds}
                        onToggle={handleToggleChapterFilter}
                      />
                    </div>
                  )}
                </div>
              </div>
            </aside>

            <div className="min-w-0 px-4 py-6 sm:px-6 xl:px-8 xl:py-8">
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm leading-6 text-zinc-600">
                    {stats.totalEvents === 0
                      ? `No timeline events exist in ${activeProjectTitle} yet.`
                      : timelineEvents.length === 0
                        ? "No timeline events match the current filters."
                        : `Reading ${timelineEvents.length} event description${timelineEvents.length === 1 ? "" : "s"} in chronological order.`}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={buildTimelineCreateHref({ createMode: "manual" })}
                      className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
                    >
                      Create event
                    </Link>
                  </div>
                </div>

                {stats.totalEvents === 0 ? (
                  <TimelineStateCard>
                    No timeline events exist in {activeProjectTitle} yet. Use the insertion plus at
                    the top to start the chronology.
                  </TimelineStateCard>
                ) : null}

                {stats.totalEvents > 0 && timelineEvents.length === 0 ? (
                  <TimelineStateCard>
                    No timeline events match the current filters. Switch back to Timeline mode or
                    reset the filters to bring descriptions back into view.
                  </TimelineStateCard>
                ) : null}

                {timelineEvents.length > 0 || stats.totalEvents === 0 ? (
                  <div className="overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-white/70 shadow-[0_24px_70px_-52px_rgba(24,24,27,0.55)]">
                    <div className="px-5 py-4 sm:px-6">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        Scroll mode
                      </p>
                      <p className="mt-2 text-sm leading-6 text-zinc-600">
                        A stripped reading view for draft-style review and inline description edits.
                      </p>
                    </div>

                    <div className="border-t border-zinc-200/80">
                      {layout.items
                        .filter(
                          (
                            item
                          ): item is TimelineLayoutEventItem | TimelineLayoutInsertionItem =>
                            item.kind !== "gap"
                        )
                        .map((item) => {
                          if (item.kind === "notch") {
                            const pendingSingleReviewState =
                              visiblePendingSingleReviewByInsertionItemId[item.id] ?? null;

                            return (
                              <TimelineInsertionRow
                                key={item.id}
                                activeJob={
                                  activeBrainDumpJob?.insertionItemId === item.id
                                    ? activeBrainDumpJob.job
                                    : visibleRestoredBrainDumpJobsByInsertionItemId[item.id] ?? null
                                }
                                activeProjectId={activeProjectId}
                                compact
                                insertionRef={(node) => registerInsertionRef(item.id, node)}
                                insertionItem={item}
                                pendingSingleReviewState={pendingSingleReviewState}
                                onApproved={handleTimelineBrainDumpApproved}
                                onOpenPendingSingleReview={() =>
                                  pendingSingleReviewState
                                    ? openPendingSingleReview(item, pendingSingleReviewState)
                                    : undefined
                                }
                                onJobReplaced={(jobId, job) =>
                                  setActiveBrainDumpJob({
                                    insertionItemId: item.id,
                                    job,
                                    jobId,
                                  })
                                }
                                onOpenComposer={(nextInsertionItem) =>
                                  setLocalCreateFlowState({
                                    createMode: "chooser",
                                    insertionContext: buildInsertionBrainDumpContext(
                                      orderedTimelineEvents,
                                      nextInsertionItem
                                    ),
                                    initialValuesOverride: null,
                                    insertionItem: nextInsertionItem,
                                    source: "local",
                                  })
                                }
                                uid={uid}
                              />
                            );
                          }

                          return (
                            <TimelineScrollEventSection
                              key={item.id}
                              onEditDescription={handleUpdateEventCardSummaryDescription}
                              onEditEvent={openEditComposer}
                              timelineEvent={item.timelineEvent}
                            />
                          );
                        })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="grid flex-1 xl:grid-cols-[22rem_minmax(0,1fr)] xl:overflow-hidden">
          <aside className="border-b border-zinc-200 bg-[#fafaf8] xl:h-full xl:overflow-hidden xl:border-b-0 xl:border-r xl:shadow-[20px_0_40px_-32px_rgba(24,24,27,0.55)]">
            <div className="flex h-full flex-col xl:sticky xl:top-0 xl:overflow-y-auto">
            <div className="border-b border-zinc-200 px-5 py-5 sm:px-6">
              <div className="mt-4 grid grid-cols-2 gap-3">
                <QuickMapStat label="Total events" value={String(stats.totalEvents)} />
                <QuickMapStat label="Showing now" value={String(stats.visibleEvents)} />
              </div>
                <div className="mt-3">
                  <QuickMapStat
                    label="Chronology range"
                    value={formatChronologySpan(timelineEvents)}
                    fullWidth
                  />
                </div>
              </div>

              <div className="flex-1">
                {layout.quickNavItems.length > 0 ? (
                  <div className="border-b border-zinc-200">
                    {layout.quickNavItems.map((quickNavItem, index) => {
                      const isSelected = quickNavItem.eventId === selectedEventId;

                      return (
                        <button
                          key={quickNavItem.eventId}
                          type="button"
                          onClick={() => focusEvent(quickNavItem.eventId)}
                          className={`w-full border-t border-zinc-200 px-5 py-4 text-left transition ${
                            isSelected
                              ? "bg-zinc-950 text-white"
                              : index % 2 === 0
                                ? "bg-white text-zinc-700 hover:bg-zinc-100"
                                : "bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
                          }`}
                        >
                          <div className="min-w-0">
                            <p
                              className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
                                isSelected ? "text-white/70" : "text-zinc-500"
                              }`}
                            >
                              Block {quickNavItem.position}
                            </p>
                            <p
                              className={`mt-2 truncate text-sm font-semibold tracking-tight ${
                                isSelected ? "text-white" : "text-zinc-950"
                              }`}
                            >
                              {quickNavItem.title}
                            </p>
                            <p
                              className={`mt-2 text-[11px] uppercase tracking-[0.18em] ${
                                isSelected ? "text-white/65" : "text-zinc-500"
                              }`}
                            >
                              {quickNavItem.chronologyLabel}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-3xl border border-dashed border-zinc-300 bg-white px-4 py-5 text-sm leading-6 text-zinc-600">
                    No visible blocks yet. Create a timeline event or loosen the filters to
                    rebuild the quick map.
                  </div>
                )}
              </div>
            </div>
          </aside>

          <section className="min-h-0 bg-[linear-gradient(180deg,#fcfcfb_0%,#f8f8f6_100%)] xl:overflow-y-auto">
            <div className={filterBarClassName}>
              <TimelineWorkspaceControls
                filters={filters}
                totalCount={stats.totalEvents}
                visibleCount={stats.visibleEvents}
                hasActiveFilters={hasActiveFilters}
                pinned={filtersPinned}
                viewMode={viewMode}
                onChange={onChange}
                onReset={onReset}
                onTogglePinned={() => setFiltersPinned((current) => !current)}
                onViewModeChange={setViewMode}
              />
            </div>

            <div className="space-y-6 p-4 sm:p-6 xl:p-8">
              <div className="flex flex-wrap justify-end gap-3">
                {firstPendingInsertionItemId ? (
                  <button
                    type="button"
                    onClick={() => focusPendingInsertionItem(firstPendingInsertionItemId)}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-4 text-sm font-medium text-amber-900 transition hover:bg-amber-100"
                  >
                    Go To Pending Event
                  </button>
                ) : null}
                <Link
                  href={buildTimelineCreateHref({ createMode: "manual" })}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
                >
                  Create timeline event
                </Link>
              </div>

              {stats.totalEvents === 0 ? (
                <TimelineStateCard>
                  No timeline events exist in {activeProjectTitle} yet. Use the create button or
                  the first insertion notch below to start the chronology.
                </TimelineStateCard>
              ) : null}

              {stats.totalEvents > 0 && timelineEvents.length === 0 ? (
                <TimelineStateCard>
                  No timeline events match the current filters. Reset or adjust the filters to
                  bring blocks back into view.
                </TimelineStateCard>
              ) : null}

              {(stats.totalEvents === 0 || timelineEvents.length > 0) && (
                <section className="pb-8">
                  <div className="relative">
                    <div className="absolute bottom-10 left-6 top-10 w-px bg-linear-to-b from-zinc-300 via-zinc-200 to-zinc-300 md:left-1/2 md:-translate-x-1/2" />

                    <div className="space-y-5 md:space-y-6">
                      {layout.items.map((item) => {
                        if (item.kind === "event") {
                          return (
                            <TimelineEventRow
                              chapterLabelsById={chapterLabelsById}
                              key={item.id}
                              bookLabelsById={bookLabelsById}
                              eventItem={item}
                              isSelected={item.timelineEvent.id === selectedEventId}
                              onSaveSummaryDescription={handleUpdateEventCardSummaryDescription}
                              onSelect={focusEvent}
                              onView={openViewer}
                              registerRef={registerEventRef}
                            />
                          );
                        }

                        if (item.kind === "gap") {
                          return <TimelineGapRow key={item.id} gapItem={item} />;
                        }

                        const pendingSingleReviewState =
                          visiblePendingSingleReviewByInsertionItemId[item.id] ?? null;

                        return (
                          <TimelineInsertionRow
                            key={item.id}
                            activeJob={
                              activeBrainDumpJob?.insertionItemId === item.id
                                ? activeBrainDumpJob.job
                                : visibleRestoredBrainDumpJobsByInsertionItemId[item.id] ?? null
                            }
                            activeProjectId={activeProjectId}
                            insertionRef={(node) => registerInsertionRef(item.id, node)}
                            insertionItem={item}
                            pendingSingleReviewState={pendingSingleReviewState}
                            onApproved={handleTimelineBrainDumpApproved}
                            onOpenPendingSingleReview={() =>
                              pendingSingleReviewState
                                ? openPendingSingleReview(item, pendingSingleReviewState)
                                : undefined
                            }
                            onJobReplaced={(jobId, job) =>
                              setActiveBrainDumpJob({
                                insertionItemId: item.id,
                                job,
                                jobId,
                              })
                            }
                            onOpenComposer={(nextInsertionItem) =>
                              setLocalCreateFlowState({
                                createMode: "chooser",
                                insertionContext: buildInsertionBrainDumpContext(
                                  orderedTimelineEvents,
                                  nextInsertionItem
                                ),
                                initialValuesOverride: null,
                                insertionItem: nextInsertionItem,
                                source: "local",
                              })
                            }
                            uid={uid}
                          />
                        );
                      })}
                    </div>
                  </div>
                </section>
              )}
            </div>
          </section>
        </section>
      )}

      {composerState ? (
        <TimelineEventComposerSheet
          activeProjectId={activeProjectId}
          aiDraftState={composerState.mode === "create" ? composerState.aiDraftState ?? null : null}
          initialValuesOverride={
            composerState.mode === "create" ? composerState.initialValuesOverride ?? null : null
          }
          insertionItem={composerState.mode === "create" ? composerState.insertionItem : null}
          mode={composerState.mode}
          onClose={closeComposer}
          onSaved={handleSaved}
          timelineEvent={editingTimelineEvent}
          uid={uid}
        />
      ) : null}

        {createFlowState ? (
          <TimelineCreateModeLightbox
            initialValues={
              createFlowState.initialValuesOverride ??
              buildInsertionInitialValuesForCreateFlow(createFlowState.insertionItem ?? null)
            }
            insertionContext={createFlowState.insertionContext ?? null}
            resumeSingleReviewState={createFlowState.pendingSingleReviewState ?? null}
            timelineInsertionItemId={createFlowState.insertionItem?.id ?? null}
            initialMode={createFlowState.createMode}
            open
            onClose={closeCreateFlow}
            onManual={(nextInitialValues) => openCreateComposerFromFlow(nextInitialValues, null)}
            onMultiJobStarted={(jobId) => void handleMultiBrainDumpJobStarted(jobId)}
            onSingleReviewStateChange={handlePendingSingleReviewStateChange}
            onUseAiDraft={(draftState, nextInitialValues) =>
              openCreateComposerFromFlow(nextInitialValues, draftState)
            }
          />
        ) : null}

      {viewingTimelineEvent && availableReferenceMaps && availableReferenceSets ? (
        <TimelineEventDetailLightbox
          knownTimelineEventIds={knownTimelineEventIds}
          onClose={() => setViewerEventId(null)}
          onDelete={handleDeleteTimelineEvent}
          onEdit={() => openEditComposer(viewingTimelineEvent.id)}
          referenceMaps={availableReferenceMaps}
          referenceSets={availableReferenceSets}
          timelineEvent={viewingTimelineEvent}
        />
      ) : null}

      {viewingTimelineEvent && (!availableReferenceMaps || !availableReferenceSets) ? (
        <TimelineEventPendingLightbox
          message={
            formOptions.error
              ? "Event detail references could not be loaded right now."
              : "Loading event details..."
          }
          onClose={() => setViewerEventId(null)}
          onEdit={() => openEditComposer(viewingTimelineEvent.id)}
          title={viewingTimelineEvent.title}
        />
      ) : null}
    </>
  );
}

function QuickMapStat({
  label,
  value,
  fullWidth = false,
}: {
  label: string;
  value: string;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={`rounded-[1.25rem] border border-zinc-200 bg-white px-4 py-3 ${
        fullWidth ? "w-full" : ""
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold tracking-tight text-zinc-950">{value}</p>
    </div>
  );
}

function FilterGroup({
  emptyLabel,
  items,
  label,
  selectedIds,
  onToggle,
}: {
  emptyLabel: string;
  items: ReadonlyArray<TimelineReferenceOption>;
  label: string;
  selectedIds: string[];
  onToggle: (value: string) => void;
}) {
  const selectedCount = selectedIds.length;

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          {label}
        </p>
        {selectedCount > 0 ? (
          <span className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
            {selectedCount}
          </span>
        ) : null}
      </div>

      {items.length > 0 ? (
        <div className="mt-3 max-h-56 space-y-1 overflow-y-auto pr-1">
          {items.map((item) => {
            const checked = selectedIds.includes(item.value);

            return (
              <label
                key={item.value}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl px-3 py-2 transition ${
                  checked ? "bg-zinc-100" : "hover:bg-zinc-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(item.value)}
                  className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-zinc-900">
                    {item.label}
                  </span>
                  {item.meta ? (
                    <span className="mt-0.5 block truncate text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                      {item.meta}
                    </span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-3 py-3 text-sm leading-6 text-zinc-600">
          {emptyLabel}
        </p>
      )}
    </section>
  );
}

function TimelineStateCard({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-zinc-300 bg-zinc-50 px-5 py-4 text-sm leading-6 text-zinc-600">
      {children}
    </section>
  );
}

function buildInsertionInitialValuesForCreateFlow(
  insertionItem: TimelineLayoutInsertionItem | null
): TimelineEventFormValues {
  return {
    title: "",
    summary: "",
    description: "",
    status: "active",
    eventType: "other",
    yearStart: insertionItem?.prefilledYearStart ?? "",
    monthStart: "",
    dayStart: "",
    yearEnd: insertionItem?.prefilledYearEnd ?? "",
    monthEnd: "",
    dayEnd: "",
    chronologyOrder: "",
    timeOfDayLabel: "",
    displayDateLabel: "",
    eraId: "",
    bookIds: [],
    chapterIds: [],
    sceneIds: [],
    characterIds: [],
    locationIds: [],
    factionIds: [],
    cultureIds: [],
    technologyIds: [],
    religionIds: [],
    plotThreadIds: [],
    themeIds: [],
    causes: "",
    consequences: "",
    predecessorEventIds: insertionItem?.previousEventId ? [insertionItem.previousEventId] : [],
    successorEventIds: insertionItem?.nextEventId ? [insertionItem.nextEventId] : [],
    publicWikiSummary: "",
  };
}

function buildInsertionBrainDumpContext(
  orderedTimelineEvents: TimelineEvent[],
  insertionItem: TimelineLayoutInsertionItem
): TimelineBrainDumpInsertionContext | null {
  if (orderedTimelineEvents.length === 0) {
    return null;
  }

  const previousIndex = insertionItem.previousEventId
    ? orderedTimelineEvents.findIndex((timelineEvent) => timelineEvent.id === insertionItem.previousEventId)
    : -1;
  const nextIndex = insertionItem.nextEventId
    ? orderedTimelineEvents.findIndex((timelineEvent) => timelineEvent.id === insertionItem.nextEventId)
    : -1;

  const insertionIndex =
    previousIndex >= 0 ? previousIndex + 1 : nextIndex >= 0 ? nextIndex : 0;
  const windowSize = 5;
  const beforeStart = Math.max(0, insertionIndex - windowSize);
  const beforeEvents = orderedTimelineEvents.slice(beforeStart, insertionIndex);
  const afterEvents = orderedTimelineEvents.slice(insertionIndex, insertionIndex + windowSize);

  const surroundingEvents: TimelineBrainDumpInsertionContext["surroundingEvents"] = [
    ...beforeEvents.map((timelineEvent, index) => ({
      chronologyLabel: formatDetailedTimelineEventRange(timelineEvent),
      id: timelineEvent.id,
      position: beforeStart + index + 1,
      relation: "before" as const,
      title: timelineEvent.title,
    })),
    ...afterEvents.map((timelineEvent, index) => ({
      chronologyLabel: formatDetailedTimelineEventRange(timelineEvent),
      id: timelineEvent.id,
      position: insertionIndex + index + 1,
      relation: "after" as const,
      title: timelineEvent.title,
    })),
  ];

  if (surroundingEvents.length === 0) {
    return null;
  }

  return {
    helperText: insertionItem.helperText,
    label: insertionItem.label,
    surroundingEvents,
  };
}

function toggleTimelineFilterValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function pruneChapterFiltersToSelectedBooks(
  selectedChapterIds: string[],
  selectedBookIds: string[],
  chapterOptions: TimelineReferenceOption[]
) {
  if (selectedBookIds.length === 0) {
    return selectedChapterIds;
  }

  const allowedChapterIds = new Set(
    chapterOptions
      .filter((option) => {
        const bookId = getChapterOptionBookId(option);
        return bookId ? selectedBookIds.includes(bookId) : false;
      })
      .map((option) => option.value)
  );

  return selectedChapterIds.filter((chapterId) => allowedChapterIds.has(chapterId));
}

function buildVisibleChapterFilterOptions(
  chapterOptions: TimelineReferenceOption[],
  selectedBookIds: string[]
) {
  if (selectedBookIds.length === 0) {
    return chapterOptions;
  }

  const selectedBookIdSet = new Set(selectedBookIds);

  return chapterOptions.filter((option) => {
    const bookId = getChapterOptionBookId(option);
    return bookId ? selectedBookIdSet.has(bookId) : false;
  });
}

function getChapterOptionBookId(option: TimelineReferenceOption) {
  const meta = option.meta?.trim();

  if (!meta) {
    return null;
  }

  if (!meta.startsWith("Book: ")) {
    return null;
  }

  return meta.slice("Book: ".length).trim() || null;
}

function TimelineEventRow({
  chapterLabelsById,
  bookLabelsById,
  eventItem,
  isSelected,
  onSaveSummaryDescription,
  onSelect,
  onView,
  registerRef,
}: {
  chapterLabelsById: ReadonlyMap<string, string>;
  bookLabelsById: ReadonlyMap<string, string>;
  eventItem: TimelineLayoutEventItem;
  isSelected: boolean;
  onSaveSummaryDescription: (
    timelineEventId: string,
    payload: { summary: string; description: string }
  ) => Promise<void>;
  onSelect: (eventId: string) => void;
  onView: (eventId: string) => void;
  registerRef: (eventId: string, node: HTMLDivElement | null) => void;
}) {
  const isLeft = eventItem.side === "left";

  return (
    <div
      ref={(node) => registerRef(eventItem.timelineEvent.id, node)}
      className="relative grid gap-4 md:grid-cols-[minmax(0,1fr)_5rem_minmax(0,1fr)] md:items-start"
    >
      <div className={`pl-16 md:pl-0 ${isLeft ? "md:col-start-1" : "md:col-start-3"}`}>
        <TimelineWorkspaceEventCard
          chapterLabelsById={chapterLabelsById}
          bookLabelsById={bookLabelsById}
          onSaveSummaryDescription={onSaveSummaryDescription}
          onView={onView}
          position={eventItem.position}
          selected={isSelected}
          timelineEvent={eventItem.timelineEvent}
        />
      </div>

      <div className="absolute left-6 top-8 flex -translate-x-1/2 justify-center md:static md:col-start-2 md:row-start-1 md:translate-x-0">
        <button
          type="button"
          onClick={() => onSelect(eventItem.timelineEvent.id)}
          className={`flex min-h-12 min-w-12 items-center justify-center rounded-full border-4 px-2 text-sm font-semibold tabular-nums transition ${
            isSelected
              ? "border-zinc-200 bg-zinc-950 text-white"
              : "border-white bg-zinc-300 text-zinc-950 hover:bg-zinc-400"
          }`}
          aria-label={`Focus ${eventItem.timelineEvent.title}`}
        >
          {eventItem.position}
        </button>
      </div>
    </div>
  );
}

function TimelineGapRow({ gapItem }: { gapItem: TimelineLayoutGapItem }) {
  return (
    <div
      className="relative"
      style={{
        height: `${gapItem.heightPx}px`,
      }}
    >
      <div className="absolute left-6 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center md:left-1/2">
        <div className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-center shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Time jump
          </p>
          <p className="mt-1 text-sm font-semibold text-zinc-950">{gapItem.label}</p>
        </div>
      </div>
    </div>
  );
}

function TimelineInsertionRow({
  activeJob,
  activeProjectId,
  compact = false,
  insertionItem,
  insertionRef,
  pendingSingleReviewState,
  onApproved,
  onOpenPendingSingleReview,
  onJobReplaced,
  onOpenComposer,
  uid,
}: {
  activeJob: AiMultiEventJobRecord | null;
  activeProjectId: string;
  compact?: boolean;
  insertionItem: TimelineLayoutInsertionItem;
  insertionRef: (node: HTMLDivElement | null) => void;
  pendingSingleReviewState: TimelineSingleEventBrainDumpReviewState | null;
  onApproved: () => Promise<void> | void;
  onOpenPendingSingleReview: () => void;
  onJobReplaced: (jobId: string, job: AiMultiEventJobRecord | null) => void;
  onOpenComposer: (insertionItem: TimelineLayoutInsertionItem) => void;
  uid: string;
}) {
  const [reviewLightboxOpen, setReviewLightboxOpen] = useState(false);
  const [failureLightboxOpen, setFailureLightboxOpen] = useState(false);
  const isRunning = activeJob?.status === "queued" || activeJob?.status === "running";
  const hasExtractedDrafts = Boolean(activeJob?.result?.events?.length);
  const isPendingApproval = activeJob?.status === "completed" && hasExtractedDrafts;
  const needsRerun = activeJob?.status === "completed" && !hasExtractedDrafts;
  const isFailed = activeJob?.status === "failed";
  const hasPendingSingleReview = Boolean(pendingSingleReviewState);
  const statusLabel = isRunning
    ? "AI building"
    : isFailed
      ? "Failed"
      : needsRerun
        ? "Needs rerun"
        : isPendingApproval
          ? "Pending approval"
          : hasPendingSingleReview
            ? "Pending review"
          : "";
  const statusMessage = isRunning
    ? "Pending BrainDump: the AI is building events for this gap."
    : isFailed
      ? activeJob?.errorMessage ??
        "This BrainDump failed. Open the error details to inspect the cause or rerun it."
      : needsRerun
        ? "No drafts were extracted. Open the BrainDump review to rerun this gap."
        : isPendingApproval
          ? "Pending approval: review the generated events before inserting more here."
          : hasPendingSingleReview
            ? "Pending review: reopen this single-event BrainDump to finish or apply it."
            : insertionItem.helperText;

  function handleActivateInsertion() {
    if (hasPendingSingleReview) {
      onOpenPendingSingleReview();
      return;
    }

    if (isPendingApproval) {
      setReviewLightboxOpen(true);
      return;
    }

    if (needsRerun) {
      setReviewLightboxOpen(true);
      return;
    }

    if (isFailed) {
      setFailureLightboxOpen(true);
      return;
    }

    onOpenComposer(insertionItem);
  }

  return (
    <div
      ref={insertionRef}
      className={
        compact
          ? "relative flex items-center gap-3 px-5 py-4 sm:px-6"
          : "relative grid gap-3 md:grid-cols-[minmax(0,1fr)_5rem_minmax(0,1fr)] md:items-center"
      }
    >
      {compact ? (
        <>
          <button
            type="button"
            onClick={handleActivateInsertion}
            disabled={isRunning}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-lg font-semibold shadow-sm transition ${
              isRunning
                ? "cursor-not-allowed border-sky-200 bg-sky-600 text-white"
                : isFailed
                  ? "timeline-failure-button border-rose-200 bg-rose-600 text-white hover:bg-rose-700"
                  : isPendingApproval || needsRerun || hasPendingSingleReview
                    ? "timeline-review-button border-amber-200 bg-amber-500 text-white hover:bg-amber-600"
                    : "border-zinc-200 bg-white text-zinc-400 hover:text-zinc-700"
            }`}
            aria-label={
              isRunning
                ? "BrainDump building timeline events"
                : isFailed
                  ? "BrainDump failed. Open error details."
                  : isPendingApproval || needsRerun || hasPendingSingleReview
                    ? "Review pending BrainDump"
                    : insertionItem.label
            }
          >
            {isRunning ? (
              <TimelineLoadingDots />
            ) : isFailed ? (
              <TimelineFailureAttentionIcon />
            ) : isPendingApproval || needsRerun || hasPendingSingleReview ? (
              <TimelineReviewAttentionIcon />
            ) : (
              "+"
            )}
          </button>

          <div className="h-px min-w-0 flex-1 bg-zinc-200/80" />

          {statusLabel ? (
            <p className="min-w-0 truncate text-xs uppercase tracking-[0.18em] text-zinc-500">
              {statusLabel}
            </p>
          ) : null}
        </>
      ) : (
        <>
          <div className="pl-16 text-left md:col-span-3 md:pl-0 md:text-center">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                {statusLabel || insertionItem.label}
              </p>
              {isPendingApproval || needsRerun || hasPendingSingleReview ? (
                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-900">
                  Review pending
                </span>
              ) : isFailed ? (
                <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-900">
                  Failed
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{statusMessage}</p>
          </div>

          <div className="absolute left-6 top-1/2 flex -translate-x-1/2 -translate-y-1/2 justify-center md:static md:col-start-2 md:row-start-1 md:translate-x-0 md:translate-y-0">
            <button
              type="button"
              onClick={handleActivateInsertion}
              disabled={isRunning}
              className={`flex h-11 w-11 items-center justify-center rounded-full border-4 border-white text-xl font-semibold shadow-sm transition ${
                isRunning
                  ? "cursor-not-allowed bg-sky-600 text-white"
                  : isFailed
                    ? "timeline-failure-button bg-rose-600 text-white hover:bg-rose-700"
                    : isPendingApproval || needsRerun || hasPendingSingleReview
                      ? "timeline-review-button bg-amber-500 text-white hover:bg-amber-600"
                      : "bg-zinc-950 text-white hover:bg-zinc-800"
              }`}
              aria-label={
                isRunning
                  ? "BrainDump building timeline events"
                  : isFailed
                    ? "BrainDump failed. Open error details."
                    : isPendingApproval || needsRerun || hasPendingSingleReview
                      ? "Review pending BrainDump"
                      : insertionItem.label
              }
            >
              {isRunning ? (
                <TimelineLoadingDots />
              ) : isFailed ? (
                <TimelineFailureAttentionIcon />
              ) : isPendingApproval || needsRerun || hasPendingSingleReview ? (
                <TimelineReviewAttentionIcon />
              ) : (
                "+"
              )}
            </button>
          </div>
        </>
      )}

      {activeJob && isRunning ? (
        <div className={compact ? "pl-12" : "pl-16 md:col-span-3 md:pl-0"}>
          <TimelineBrainDumpJobReview
            activeProjectId={activeProjectId}
            job={activeJob}
            onApproved={onApproved}
            uid={uid}
          />
        </div>
      ) : null}

      {activeJob && (isPendingApproval || needsRerun) && reviewLightboxOpen ? (
        <TimelineBrainDumpReviewLightbox
          activeProjectId={activeProjectId}
          job={activeJob}
          onApproved={async () => {
            setReviewLightboxOpen(false);
            await onApproved();
          }}
          onClose={() => setReviewLightboxOpen(false)}
          onJobReplaced={onJobReplaced}
          uid={uid}
        />
      ) : null}

      {activeJob && isFailed && failureLightboxOpen ? (
        <TimelineBrainDumpFailureLightbox
          job={activeJob}
          onClose={() => setFailureLightboxOpen(false)}
          onJobReplaced={onJobReplaced}
        />
      ) : null}
    </div>
  );
}

function TimelineScrollEventSection({
  onEditDescription,
  onEditEvent,
  timelineEvent,
}: {
  onEditDescription: (
    timelineEventId: string,
    payload: { summary: string; description: string }
  ) => Promise<void>;
  onEditEvent: (timelineEventId: string) => void;
  timelineEvent: TimelineEvent;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [draftDescription, setDraftDescription] = useState(timelineEvent.description);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingDescription, setSavingDescription] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const descriptionEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const normalizedDescription = timelineEvent.description.trim();

  useEffect(() => {
    setDraftDescription(timelineEvent.description);
    setEditingDescription(false);
    setMenuOpen(false);
    setSaveError(null);
  }, [timelineEvent.description, timelineEvent.id]);

  useEffect(() => {
    if (!menuOpen && !editingDescription) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (containerRef.current?.contains(target) || menuButtonRef.current?.contains(target)) {
        return;
      }

      setMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setEditingDescription(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [editingDescription, menuOpen]);

  useEffect(() => {
    if (!editingDescription) {
      return;
    }

    const textarea = descriptionEditorRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [draftDescription, editingDescription]);

  async function handleSaveDescription(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingDescription(true);
    setSaveError(null);

    try {
      await onEditDescription(timelineEvent.id, {
        summary: timelineEvent.summary,
        description: draftDescription,
      });
      setEditingDescription(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to update this description.");
    } finally {
      setSavingDescription(false);
    }
  }

  return (
    <article
      ref={containerRef}
      className="relative px-5 py-6 sm:px-6"
    >
      <div className="absolute right-4 top-4 z-20">
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-zinc-500 transition hover:border-zinc-200 hover:bg-zinc-50 hover:text-zinc-800"
          aria-label={`Event actions for ${timelineEvent.title}`}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <DotsIcon />
        </button>

        {menuOpen ? (
          <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onEditEvent(timelineEvent.id);
              }}
              className="block w-full px-4 py-3 text-left text-sm text-zinc-700 transition hover:bg-zinc-50"
            >
              Edit Event
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setEditingDescription(true);
              }}
              className="block w-full px-4 py-3 text-left text-sm text-zinc-700 transition hover:bg-zinc-50"
            >
              Edit Description
            </button>
          </div>
        ) : null}
      </div>

      {editingDescription ? (
        <form onSubmit={handleSaveDescription} className="pr-14">
          <label className="block">
            <span className="sr-only">Edit description</span>
            <textarea
              ref={descriptionEditorRef}
              value={draftDescription}
              onChange={(event) => setDraftDescription(event.target.value)}
              className="min-h-40 w-full resize-none overflow-hidden rounded-3xl border border-zinc-200 bg-white px-4 py-4 font-serif text-[1.02rem] leading-8 text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-950/10"
              placeholder="Write the event description."
            />
          </label>

          {saveError ? (
            <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {saveError}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={savingDescription}
              className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {savingDescription ? "Saving..." : "Save description"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingDescription(false);
                setDraftDescription(timelineEvent.description);
                setSaveError(null);
              }}
              className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <p className="pr-14 font-serif text-[1.02rem] leading-8 text-zinc-900">
          {normalizedDescription || "No description yet."}
        </p>
      )}
    </article>
  );
}

function DotsIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-4 w-4 text-zinc-500"
      fill="currentColor"
    >
      <circle cx="3" cy="8" r="1.25" />
      <circle cx="8" cy="8" r="1.25" />
      <circle cx="13" cy="8" r="1.25" />
    </svg>
  );
}

function TimelineLoadingDots() {
  return (
    <span className="timeline-loading-dots" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

function TimelineReviewAttentionIcon() {
  return (
    <span className="timeline-review-mark" aria-hidden="true">
      !
    </span>
  );
}

function TimelineFailureAttentionIcon() {
  return (
    <span className="timeline-failure-mark" aria-hidden="true">
      !
    </span>
  );
}

function TimelineBrainDumpReviewLightbox({
  activeProjectId,
  job,
  onApproved,
  onClose,
  onJobReplaced,
  uid,
}: {
  activeProjectId: string;
  job: AiMultiEventJobRecord;
  onApproved: () => Promise<void> | void;
  onClose: () => void;
  onJobReplaced: (jobId: string, job: AiMultiEventJobRecord | null) => void;
  uid: string;
}) {
  const [rerunning, setRerunning] = useState(false);
  const [rerunError, setRerunError] = useState<string | null>(null);

  async function handleRerunBrainDump() {
    const brainDumpText = job.input?.brainDumpText?.trim();

    if (!brainDumpText) {
      setRerunError("This job does not have source brain dump text available to rerun.");
      return;
    }

    setRerunning(true);
    setRerunError(null);

    try {
      const started = await window.bookBible.ai.startMultiEventTimelineBrainDumpJob({
        brainDumpText,
        projectContext: job.input?.projectContext ?? undefined,
        projectTitle: job.input?.projectTitle ?? undefined,
        timelineInsertionItemId: job.input?.timelineInsertionItemId ?? undefined,
      });
      const nextJob = await window.bookBible.ai.getJobStatus(started.jobId);
      onJobReplaced(started.jobId, nextJob);
      onClose();
    } catch (error) {
      setRerunError(error instanceof Error ? error.message : "Unable to rerun this BrainDump.");
    } finally {
      setRerunning(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-zinc-950/45 px-4 py-6 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 mx-auto w-full max-w-5xl rounded-4xl border border-zinc-200 bg-[#fffdf9] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 bg-white px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Timeline BrainDump
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
              Review generated events
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              These drafts were generated for this insertion point. Review, edit, skip, or apply
              them without leaving the timeline.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 text-lg text-zinc-700 transition hover:bg-zinc-50"
            aria-label="Close BrainDump review"
          >
            x
          </button>
        </div>

        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto px-6 py-6">
          <TimelineBrainDumpJobReview
            activeProjectId={activeProjectId}
            job={job}
            onApproved={onApproved}
            onRerun={handleRerunBrainDump}
            rerunning={rerunning}
            uid={uid}
          />
          {rerunError ? (
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {rerunError}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TimelineBrainDumpFailureLightbox({
  job,
  onClose,
  onJobReplaced,
}: {
  job: AiMultiEventJobRecord;
  onClose: () => void;
  onJobReplaced: (jobId: string, job: AiMultiEventJobRecord | null) => void;
}) {
  const [rerunning, setRerunning] = useState(false);
  const [rerunError, setRerunError] = useState<string | null>(null);

  async function handleRerunBrainDump() {
    const brainDumpText = job.input?.brainDumpText?.trim();

    if (!brainDumpText) {
      setRerunError("This failed job does not have source brain dump text available to rerun.");
      return;
    }

    setRerunning(true);
    setRerunError(null);

    try {
      const started = await window.bookBible.ai.startMultiEventTimelineBrainDumpJob({
        brainDumpText,
        projectContext: job.input?.projectContext ?? undefined,
        projectTitle: job.input?.projectTitle ?? undefined,
        timelineInsertionItemId: job.input?.timelineInsertionItemId ?? undefined,
      });
      const nextJob = await window.bookBible.ai.getJobStatus(started.jobId);
      onJobReplaced(started.jobId, nextJob);
      onClose();
    } catch (error) {
      setRerunError(error instanceof Error ? error.message : "Unable to rerun this BrainDump.");
    } finally {
      setRerunning(false);
    }
  }

  const warningLines = Array.isArray(job.warnings) ? job.warnings : [];
  const chunkMetrics = Array.isArray(job.chunkMetrics) ? job.chunkMetrics : [];

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-zinc-950/45 px-4 py-6 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 mx-auto w-full max-w-5xl rounded-4xl border border-rose-200 bg-[#fffdf9] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-rose-200 bg-white px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-500">
              Timeline BrainDump
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-rose-950">
              BrainDump failed
            </h2>
            <p className="mt-3 text-sm leading-6 text-rose-900/80">
              The job ran but stopped before it could finish the review/apply path. Inspect the
              error and rerun from here if the source text is still correct.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-rose-200 text-lg text-rose-700 transition hover:bg-rose-50"
            aria-label="Close BrainDump failure details"
          >
            x
          </button>
        </div>

        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto px-6 py-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.6fr)]">
            <section className="rounded-3xl border border-rose-200 bg-white p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-500">
                Error details
              </p>
              <p className="mt-3 whitespace-pre-wrap rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-900">
                {job.errorMessage ?? "No error message was captured for this failed job."}
              </p>

              {rerunError ? (
                <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {rerunError}
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleRerunBrainDump()}
                  disabled={rerunning}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-rose-600 px-5 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {rerunning ? "Rerunning..." : "Rerun BrainDump"}
                </button>

                <Link
                  href={`/ai-jobs/${job.id}`}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50"
                >
                  Open job page
                </Link>
              </div>
            </section>

            <aside className="space-y-4">
              <div className="rounded-3xl border border-zinc-200 bg-white p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Job
                </p>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-zinc-500">Status</dt>
                    <dd className="font-medium text-rose-700">{job.status}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-zinc-500">Failure category</dt>
                    <dd className="font-medium text-zinc-950">{job.failureCategory ?? "unknown"}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-zinc-500">Attempts</dt>
                    <dd className="font-medium text-zinc-950">{job.progress.totalAttempts ?? 0}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-zinc-500">Retries</dt>
                    <dd className="font-medium text-zinc-950">{job.progress.totalRetries ?? 0}</dd>
                  </div>
                </dl>
              </div>

              {warningLines.length > 0 ? (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">
                    Warnings
                  </p>
                  <ul className="mt-4 space-y-2 text-sm leading-6 text-amber-950">
                    {warningLines.map((line, index) => (
                      <li key={`${index}-${line}`}>• {line}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {chunkMetrics.length > 0 ? (
                <div className="rounded-3xl border border-zinc-200 bg-white p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Chunk metrics
                  </p>
                  <div className="mt-4 space-y-3 text-sm">
                    {chunkMetrics.map((metric) => (
                      <div
                        key={`${metric.chunkIndex}-${metric.category}`}
                        className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3"
                      >
                        <p className="font-medium text-zinc-950">Chunk {metric.chunkIndex + 1}</p>
                        <p className="mt-1 text-zinc-600">
                          {metric.category}
                          {typeof metric.durationMs === "number"
                            ? ` · ${Math.round(metric.durationMs)} ms`
                            : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineEventPendingLightbox({
  message,
  onClose,
  onEdit,
  title,
}: {
  message: string;
  onClose: () => void;
  onEdit: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 px-4 py-6 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 w-full max-w-xl rounded-4xl border border-zinc-200 bg-[#fffdf9] p-6 shadow-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Timeline event
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">{title}</h2>
        <p className="mt-4 text-sm leading-6 text-zinc-600">{message}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Edit event
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function formatChronologySpan(timelineEvents: TimelineEvent[]) {
  const earliestDate = getTimelineBoundaryDate(timelineEvents, "earliest");
  const latestDate = getTimelineBoundaryDate(timelineEvents, "latest");

  if (!earliestDate || !latestDate || latestDate.getTime() < earliestDate.getTime()) {
    return "Undated";
  }

  const parts = getDurationParts(earliestDate, latestDate);

  return [
    formatDurationPart(parts.years, "yr"),
    formatDurationPart(parts.months, "mo"),
    formatDurationPart(parts.weeks, "wk"),
    formatDurationPart(parts.days, "day"),
    formatDurationPart(parts.minutes, "min"),
    formatDurationPart(parts.seconds, "sec"),
  ].join(" ");
}

function getTimelineBoundaryDate(
  timelineEvents: TimelineEvent[],
  boundary: "earliest" | "latest"
) {
  const dates = timelineEvents
    .map((timelineEvent) => buildTimelineBoundaryDate(timelineEvent, boundary))
    .filter((value): value is Date => value instanceof Date);

  if (dates.length === 0) {
    return null;
  }

  return new Date(
    boundary === "earliest"
      ? Math.min(...dates.map((value) => value.getTime()))
      : Math.max(...dates.map((value) => value.getTime()))
  );
}

function buildTimelineBoundaryDate(
  timelineEvent: TimelineEvent,
  boundary: "earliest" | "latest"
) {
  const year =
    boundary === "earliest"
      ? timelineEvent.yearStart ?? timelineEvent.yearEnd
      : timelineEvent.yearEnd ?? timelineEvent.yearStart;

  if (typeof year !== "number") {
    return null;
  }

  const monthValue =
    boundary === "earliest"
      ? timelineEvent.monthStart ?? timelineEvent.monthEnd ?? 1
      : timelineEvent.monthEnd ?? timelineEvent.monthStart ?? 12;
  const dayValue =
    boundary === "earliest"
      ? timelineEvent.dayStart ?? timelineEvent.dayEnd ?? 1
      : timelineEvent.dayEnd ??
        timelineEvent.dayStart ??
        getDaysInMonth(year, monthValue);

  return new Date(Date.UTC(year, monthValue - 1, dayValue));
}

function getDurationParts(startDate: Date, endDate: Date) {
  let cursor = new Date(startDate.getTime());
  let years = 0;
  let months = 0;

  while (addUtcYears(cursor, 1).getTime() <= endDate.getTime()) {
    cursor = addUtcYears(cursor, 1);
    years += 1;
  }

  while (addUtcMonths(cursor, 1).getTime() <= endDate.getTime()) {
    cursor = addUtcMonths(cursor, 1);
    months += 1;
  }

  const remainingMs = endDate.getTime() - cursor.getTime();
  const totalDays = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;
  const remainingMinutes = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 1000));
  const minutes = remainingMinutes;
  const seconds = Math.floor((remainingMs % (60 * 1000)) / 1000);

  return {
    years,
    months,
    weeks,
    days,
    minutes,
    seconds,
  };
}

function addUtcYears(date: Date, yearsToAdd: number) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear() + yearsToAdd,
      date.getUTCMonth(),
      Math.min(date.getUTCDate(), getDaysInMonth(date.getUTCFullYear() + yearsToAdd, date.getUTCMonth() + 1))
    )
  );
}

function addUtcMonths(date: Date, monthsToAdd: number) {
  const targetMonthIndex = date.getUTCMonth() + monthsToAdd;
  const targetYear = date.getUTCFullYear() + Math.floor(targetMonthIndex / 12);
  const normalizedMonthIndex = ((targetMonthIndex % 12) + 12) % 12;
  const targetMonth = normalizedMonthIndex + 1;

  return new Date(
    Date.UTC(
      targetYear,
      normalizedMonthIndex,
      Math.min(date.getUTCDate(), getDaysInMonth(targetYear, targetMonth))
    )
  );
}

function getDaysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function formatDurationPart(value: number, label: string) {
  return `${value}${label}`;
}
