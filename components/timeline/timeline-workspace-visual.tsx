"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ChapterDraftWorkspace } from "@/components/manuscript/chapter-draft-workspace";
import { TimelineBrainDumpJobReview } from "@/components/timeline/timeline-brain-dump-job-review";
import { TimelineBookmarkCollectionPicker } from "@/components/timeline/timeline-bookmark-collection-picker";
import { TimelineCreateModeLightbox } from "@/components/timeline/timeline-create-mode-lightbox";
import { TimelineEntityEditorLightbox } from "@/components/timeline/timeline-entity-editor-lightbox";
import { TimelineEventComposerSheet } from "@/components/timeline/timeline-event-composer-sheet";
import { TimelineEventDetailLightbox } from "@/components/timeline/timeline-event-detail-lightbox";
import { TimelineDraftMenu } from "@/components/timeline/timeline-draft-menu";
import { TimelineWorkspaceControls } from "@/components/timeline/timeline-workspace-controls";
import { TimelineWorkspaceEventCard } from "@/components/timeline/timeline-workspace-event-card";
import {
  createTimelineBookmarkCollection,
  getTimelineEventBookmarkCollectionId,
  hexToRgba,
  isTimelineEventBookmarked,
  useTimelineBookmarkCollections,
} from "@/lib/timeline/bookmark-collections";
import type { TimelineEntitySliceType } from "@/lib/timeline/entity-editor";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { useTimelineFormOptions } from "@/hooks/use-timeline-form-options";
import {
  deleteTimelineEventForProject,
  setTimelineEventBookmarkedForProject,
  updateTimelineEventSummaryAndDescriptionForProject,
} from "@/lib/data/timeline-events";
import {
  buildTimelineLayoutModel,
  type TimelineLayoutEventItem,
  type TimelineLayoutGapItem,
  type TimelineLayoutInsertionItem,
} from "@/lib/timeline/layout";
import {
  loadPendingSingleReviewMap,
  savePendingSingleReviewMap,
} from "@/lib/timeline/pending-single-review";
import {
  saveTimelineWorkspacePreferences,
  useTimelineWorkspacePreferences,
} from "@/lib/timeline/workspace-preferences";
import {
  buildTimelineCreateHref,
  buildTimelineCreateInitialValuesFromSearchParams,
  clearTimelineCreateSearchParams,
  getTimelineCreateMode,
  hasTimelineCreateSearchParams,
} from "@/lib/timeline/create-route";
import { formatDetailedTimelineEventRange } from "@/lib/timeline/workspace";
import {
  getTimelineWorkspaceBookmarkAccentColor,
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

const TIMELINE_SELECTION_ACCENT = "#c86a2e";

function isKeyboardScrollTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.closest("button, a, input, textarea, select, [contenteditable='true']")) {
    return true;
  }

  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

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
  const [timelineZoom, setTimelineZoom] = useState(100);
  const [zoomPopoverOpen, setZoomPopoverOpen] = useState(false);
  const [activeSplitPane, setActiveSplitPane] = useState<"scroll" | "draft">("scroll");
  const splitScrollPaneRef = useRef<HTMLDivElement | null>(null);
  const splitDraftScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const splitPaneInitializedRef = useRef(false);
  const [bookmarkPickerState, setBookmarkPickerState] = useState<{
    timelineEventId: string;
    currentCollectionId: string | null;
  } | null>(null);
  const [requestedSelectedEventId, setRequestedSelectedEventId] = useState<string | null>(null);
  const [viewerEventId, setViewerEventId] = useState<string | null>(null);
  const [activeEntityEditorSlice, setActiveEntityEditorSlice] =
    useState<TimelineEntitySliceType | null>(null);
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
  const zoomPopoverHideTimeoutRef = useRef<number | null>(null);
  const lastLoggedSnapshotKeyRef = useRef<string | null>(null);
  const bookmarkCollections = useTimelineBookmarkCollections(activeProjectId);
  const activeBookmarkAccentColor = useMemo(
    () => getTimelineWorkspaceBookmarkAccentColor(filters, bookmarkCollections),
    [bookmarkCollections, filters]
  );
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
  const timelineEventIdsKey = timelineEvents.map((timelineEvent) => timelineEvent.id).join("|");
  const layoutItemIdsKey = layout.items
    .map((item) => `${item.kind}:${item.id}`)
    .join("|");

  const activeBrainDumpJobId = activeBrainDumpJob?.jobId ?? null;

  function clearZoomPopoverHideTimeout() {
    if (zoomPopoverHideTimeoutRef.current !== null) {
      window.clearTimeout(zoomPopoverHideTimeoutRef.current);
      zoomPopoverHideTimeoutRef.current = null;
    }
  }

  useEffect(() => {
    if (typeof window === "undefined" || process.env.NODE_ENV === "production") {
      return;
    }

    const snapshotKey = [activeProjectId, viewMode, timelineEventIdsKey, layoutItemIdsKey].join(
      "::"
    );

    if (lastLoggedSnapshotKeyRef.current === snapshotKey) {
      return;
    }

    lastLoggedSnapshotKeyRef.current = snapshotKey;

    const timelineEventIds = timelineEvents.map((timelineEvent) => timelineEvent.id);
    const layoutEventIds = layout.items
      .filter((item): item is TimelineLayoutEventItem => item.kind === "event")
      .map((item) => item.id);
    const duplicateTimelineEventIds = findDuplicateValues(timelineEventIds);
    const duplicateLayoutEventIds = findDuplicateValues(layoutEventIds);
    const duplicateLayoutIds = findDuplicateValues(layout.items.map((item) => item.id));

    console.log("[timeline:workspace] render snapshot", {
      activeProjectId,
      viewMode,
      totalTimelineEvents: timelineEvents.length,
      totalLayoutItems: layout.items.length,
      eventItemCount: layoutEventIds.length,
      duplicateTimelineEventIds,
      duplicateLayoutEventIds,
      duplicateLayoutIds,
      firstTimelineEventIds: timelineEventIds.slice(0, 5),
      lastTimelineEventIds: timelineEventIds.slice(-5),
      layoutTail: layout.items.slice(-8).map((item) => ({
        id: item.id,
        kind: item.kind,
      })),
    });
  }, [activeProjectId, layoutItemIdsKey, timelineEventIdsKey, timelineEvents, viewMode]);

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
    return () => {
      clearZoomPopoverHideTimeout();
    };
  }, []);

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

  async function handleToggleBookmark(timelineEventId: string, bookmarked: boolean) {
    if (bookmarked) {
      setBookmarkPickerState({ timelineEventId, currentCollectionId: null });
      return;
    }

    await setTimelineEventBookmarkedForProject(uid, activeProjectId, timelineEventId, false);
    await onRefreshTimelineEvents();
  }

  function handleOpenBookmarkCollectionPicker(timelineEvent: TimelineEvent) {
    setBookmarkPickerState({
      timelineEventId: timelineEvent.id,
      currentCollectionId: getTimelineEventBookmarkCollectionId(timelineEvent),
    });
  }

  async function handleSaveBookmarkCollection(selection:
    | { mode: "existing"; collectionId: string }
    | { mode: "new"; collectionColor: string; collectionName: string }
  ) {
    if (!bookmarkPickerState) {
      return;
    }

    const timelineEventId = bookmarkPickerState.timelineEventId;

    try {
      if (selection.mode === "existing") {
        await setTimelineEventBookmarkedForProject(
          uid,
          activeProjectId,
          timelineEventId,
          true,
          selection.collectionId
        );
      } else {
        const collection = createTimelineBookmarkCollection(activeProjectId, {
          color: selection.collectionColor,
          name: selection.collectionName,
        });

        await setTimelineEventBookmarkedForProject(
          uid,
          activeProjectId,
          timelineEventId,
          true,
          collection.id
        );
      }

      setBookmarkPickerState(null);
      await onRefreshTimelineEvents();
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Unable to save this bookmark collection."
      );
    }
  }

  function openEntityEditor(sliceType: TimelineEntitySliceType) {
    setActiveEntityEditorSlice(sliceType);
  }

  function closeEntityEditor() {
    setActiveEntityEditorSlice(null);
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
    if (typeof window !== "undefined") {
      console.log("[timeline:create-flow] opening composer", {
        aiDraft: Boolean(aiDraftState),
        insertionItem: createFlowState?.insertionItem
          ? {
              fallbackYear: createFlowState.insertionItem.fallbackYear,
              helperText: createFlowState.insertionItem.helperText,
              id: createFlowState.insertionItem.id,
              nextEventId: createFlowState.insertionItem.nextEventId,
              nextEventTitle: createFlowState.insertionItem.nextEventTitle,
              previousEventId: createFlowState.insertionItem.previousEventId,
              previousEventTitle: createFlowState.insertionItem.previousEventTitle,
              prefilledYearEnd: createFlowState.insertionItem.prefilledYearEnd,
              prefilledYearStart: createFlowState.insertionItem.prefilledYearStart,
            }
          : null,
        source,
      });
    }
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

  const handlePendingSingleReviewStateChange = useCallback(
    (insertionItemId: string, state: TimelineSingleEventBrainDumpReviewState | null) => {
      if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
        console.log("[timeline:single-review] pending state change", {
          hasState: Boolean(state),
          insertionItemId,
        });
      }

      setPendingSingleReviewByInsertionItemId((current) => {
        if (!state) {
          if (!(insertionItemId in current)) {
            return current;
          }

          const next = { ...current };
          delete next[insertionItemId];
          return next;
        }

        if (current[insertionItemId] === state) {
          return current;
        }

        return {
          ...current,
          [insertionItemId]: state,
        };
      });
    },
    []
  );

  function openPendingSingleReview(
    insertionItem: TimelineLayoutInsertionItem,
    state: TimelineSingleEventBrainDumpReviewState
  ) {
    const insertionContext = buildInsertionBrainDumpContext(orderedTimelineEvents, insertionItem);

    if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
      console.log("[timeline:single-review] opening review", {
        insertionContext:
          insertionContext?.surroundingEvents.map((event) => ({
            id: event.id,
            position: event.position,
            relation: event.relation,
            title: event.title,
          })) ?? [],
        insertionItem: {
          fallbackYear: insertionItem.fallbackYear,
          helperText: insertionItem.helperText,
          id: insertionItem.id,
          nextEventId: insertionItem.nextEventId,
          nextEventTitle: insertionItem.nextEventTitle,
          previousEventId: insertionItem.previousEventId,
          previousEventTitle: insertionItem.previousEventTitle,
          prefilledYearEnd: insertionItem.prefilledYearEnd,
          prefilledYearStart: insertionItem.prefilledYearStart,
        },
      });
    }

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

  const isScrollMode = viewMode === "scroll";
  const isDraftSplitScreen = searchParams.get("draftPane") === "split";
  const effectiveActiveSplitPane = isDraftSplitScreen ? activeSplitPane : "scroll";
  const chronologyRange = formatChronologySpan(timelineEvents);
  const filterBarClassName =
    filtersPinned
      ? "xl:sticky xl:top-0 xl:z-20 xl:shadow-[0_18px_45px_-36px_rgba(24,24,27,0.55)]"
      : "";
  const showSplitPaneShadows = isDraftSplitScreen;
  const filtersPreferences = useTimelineWorkspacePreferences();
  const scrollEventDisplayMode = filtersPreferences.scrollEventDisplayMode;

  function renderWorkspaceControls(splitLayout: boolean) {
    return (
      <div className={filterBarClassName}>
        <TimelineWorkspaceControls
          bookOptions={formOptions.bookOptions}
          chapterBookIdById={formOptions.chapterBookIdById}
          chapterOptions={formOptions.chapterOptions}
          createHref={buildTimelineCreateHref({ createMode: "manual" })}
          bookmarkCollections={bookmarkCollections}
          filters={filters}
          chronologyRange={chronologyRange}
          totalCount={stats.totalEvents}
          visibleCount={stats.visibleEvents}
          hasActiveFilters={hasActiveFilters}
          optionsError={formOptions.error}
          optionsLoading={formOptions.loading}
          collapsed={filtersPreferences.filtersCollapsed}
          splitLayout={splitLayout}
          forceExpanded={splitLayout}
          showCollapsedHint={showCollapsedFiltersHint}
          pinned={filtersPinned}
          viewMode={viewMode}
          onChange={onChange}
          onOpenEntityEditor={openEntityEditor}
          onReset={onReset}
          onToggleCollapsed={handleToggleFiltersCollapsed}
          onTogglePinned={() => setFiltersPinned((current) => !current)}
          onViewModeChange={setViewMode}
        />
      </div>
    );
  }

  useScrollLock(isDraftSplitScreen);

  useEffect(() => {
    if (splitPaneInitializedRef.current) {
      return;
    }

    splitPaneInitializedRef.current = true;

    if (!isDraftSplitScreen) {
      return;
    }

    if (
      typeof window !== "undefined" &&
      window.sessionStorage.getItem("bookBible.timelineSplitPane") !== "1"
    ) {
      const nextSearchParams = new URLSearchParams(searchParams.toString());
      nextSearchParams.delete("draftPane");

      const nextUrl =
        nextSearchParams.toString().length > 0
          ? `${pathname}?${nextSearchParams.toString()}`
          : pathname;

      router.replace(nextUrl, { scroll: false });
    }
  }, [isDraftSplitScreen, pathname, router, searchParams]);

  useEffect(() => {
    if (!isDraftSplitScreen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isKeyboardScrollTarget(event.target)) {
        return;
      }

      const scrollContainer =
        effectiveActiveSplitPane === "draft"
          ? splitDraftScrollContainerRef.current
          : splitScrollPaneRef.current;

      if (!scrollContainer) {
        return;
      }

      const pageStep = Math.max(240, Math.floor(scrollContainer.clientHeight * 0.85));

      switch (event.key) {
        case "ArrowDown":
          scrollContainer.scrollBy({ top: 56, behavior: "auto" });
          break;
        case "ArrowUp":
          scrollContainer.scrollBy({ top: -56, behavior: "auto" });
          break;
        case "PageDown":
          scrollContainer.scrollBy({ top: pageStep, behavior: "auto" });
          break;
        case "PageUp":
          scrollContainer.scrollBy({ top: -pageStep, behavior: "auto" });
          break;
        case " ":
          scrollContainer.scrollBy({
            top: event.shiftKey ? -pageStep : pageStep,
            behavior: "auto",
          });
          break;
        case "Home":
          scrollContainer.scrollTo({ top: 0, behavior: "auto" });
          break;
        case "End":
          scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: "auto" });
          break;
        default:
          return;
      }

      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [effectiveActiveSplitPane, isDraftSplitScreen]);

  function handleToggleFiltersCollapsed() {
    saveTimelineWorkspacePreferences({
      filtersCollapsed: !filtersPreferences.filtersCollapsed,
      filtersHintSeen:
        filtersPreferences.filtersHintSeen || filtersPreferences.filtersCollapsed,
      scrollEventDisplayMode: filtersPreferences.scrollEventDisplayMode,
    });
  }

  function handleScrollEventDisplayModeChange(
    nextScrollEventDisplayMode: typeof filtersPreferences.scrollEventDisplayMode
  ) {
    saveTimelineWorkspacePreferences({
      filtersCollapsed: filtersPreferences.filtersCollapsed,
      filtersHintSeen: filtersPreferences.filtersHintSeen,
      scrollEventDisplayMode: nextScrollEventDisplayMode,
    });
  }

  function updateDraftPane(nextDraftPane: "split" | null) {
    const nextSearchParams = new URLSearchParams(searchParams.toString());

    if (nextDraftPane) {
      nextSearchParams.set("draftPane", nextDraftPane);
    } else {
      nextSearchParams.delete("draftPane");
    }

    const nextUrl =
      nextSearchParams.toString().length > 0
        ? `${pathname}?${nextSearchParams.toString()}`
        : pathname;

    router.replace(nextUrl, { scroll: false });
  }

  async function handleOpenManuscriptWindow() {
    await window.bookBible.manuscript.openWindow();
  }

  function handleOpenManuscriptSplitScreen() {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("bookBible.timelineSplitPane", "1");
    }

    setActiveSplitPane("draft");
    updateDraftPane("split");
  }

  function handleCloseManuscriptSplitScreen() {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("bookBible.timelineSplitPane");
    }

    setActiveSplitPane("scroll");
    updateDraftPane(null);
  }

  const showCollapsedFiltersHint =
    filtersPreferences.filtersCollapsed && !filtersPreferences.filtersHintSeen;
  const timelineDensity = Math.max(0.2, Math.min(1, timelineZoom / 100));

  function openZoomPopover() {
    clearZoomPopoverHideTimeout();
    setZoomPopoverOpen(true);
  }

  function scheduleCloseZoomPopover() {
    clearZoomPopoverHideTimeout();
    zoomPopoverHideTimeoutRef.current = window.setTimeout(() => {
      setZoomPopoverOpen(false);
      zoomPopoverHideTimeoutRef.current = null;
    }, 1800);
  }

  function renderSplitShell(leftPane: ReactNode) {
    return (
      <section className="flex min-h-0 flex-1 flex-col">
        <div className="relative grid h-full flex-1 min-h-0 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)]">
          <div
            className={`flex h-full min-h-0 min-w-0 flex-col overflow-hidden ${
              showSplitPaneShadows && effectiveActiveSplitPane === "scroll"
                ? "relative z-10 shadow-[24px_0_60px_-42px_rgba(24,24,27,0.8)]"
                : ""
            }`}
            onPointerEnter={() => setActiveSplitPane("scroll")}
            onPointerDown={() => setActiveSplitPane("scroll")}
          >
            <div className="flex-none">{renderWorkspaceControls(true)}</div>

            <div
              ref={splitScrollPaneRef}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-1 pb-1 sm:px-6 sm:pt-2 sm:pb-2 xl:px-8 xl:pt-3 xl:pb-3"
              onPointerEnter={() => setActiveSplitPane("scroll")}
            >
              {leftPane}
            </div>
          </div>

          <div className="hidden bg-zinc-300/70 lg:block" aria-hidden="true" />

          <div
            className={`flex h-full min-h-0 min-w-0 flex-col overflow-hidden ${
              showSplitPaneShadows && effectiveActiveSplitPane === "draft"
                ? "relative z-10 shadow-[-24px_0_60px_-42px_rgba(24,24,27,0.8)]"
                : ""
            }`}
            onPointerEnter={() => setActiveSplitPane("draft")}
            onPointerDown={() => setActiveSplitPane("draft")}
          >
            <ChapterDraftWorkspace
              activeProjectId={activeProjectId}
              layoutMode="embedded"
              scrollContainerRef={splitDraftScrollContainerRef}
              onCloseEmbedded={handleCloseManuscriptSplitScreen}
              uid={uid}
            />
          </div>
        </div>
      </section>
    );
  }

  function renderScrollSplitLeftPane() {
    return (
      <div className="mx-auto flex w-full max-w-none flex-col gap-2">
        <div className="flex w-full flex-wrap items-start justify-between gap-2">
          <div className="inline-flex rounded-full border border-zinc-200 bg-white/85 p-1 shadow-[0_12px_24px_-18px_rgba(24,24,27,0.4)] backdrop-blur">
            {(["descriptions", "both", "summary"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleScrollEventDisplayModeChange(mode)}
                className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition ${
                  scrollEventDisplayMode === mode
                    ? "bg-zinc-950 text-white shadow-sm"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                {mode === "descriptions" ? "Descriptions" : mode === "both" ? "Both" : "Summary"}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <TimelineDraftMenu
              onNewWindow={() => void handleOpenManuscriptWindow()}
              onSplitScreen={handleOpenManuscriptSplitScreen}
            />
          </div>
        </div>

        {stats.totalEvents === 0 ? (
          <TimelineStateCard>
            No timeline events exist in {activeProjectTitle} yet. Use the insertion plus at the top
            to start the chronology.
          </TimelineStateCard>
        ) : null}

        {stats.totalEvents > 0 && timelineEvents.length === 0 ? (
          <TimelineStateCard>
            No timeline events match the current filters. Switch back to Timeline mode or reset the
            filters to bring descriptions back into view.
          </TimelineStateCard>
        ) : null}

        {timelineEvents.length > 0 || stats.totalEvents === 0 ? (
          <div className="rounded-[2rem] border border-zinc-200/80 bg-white/70 shadow-[0_24px_70px_-52px_rgba(24,24,27,0.55)]">
            <div>
              {layout.items
                .filter(
                  (item): item is TimelineLayoutEventItem | TimelineLayoutInsertionItem =>
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
                      onEditSummary={handleUpdateEventCardSummaryDescription}
                      onEditEvent={openEditComposer}
                      onOpenBookmarkCollectionPicker={handleOpenBookmarkCollectionPicker}
                      displayMode={scrollEventDisplayMode}
                      timelineEvent={item.timelineEvent}
                      bookmarkAccentColor={activeBookmarkAccentColor}
                    />
                  );
                })}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  function renderTimelineSplitLeftPane() {
    return (
      <div className="relative mx-auto flex w-full max-w-none flex-col gap-2">
        <div className="flex w-full flex-wrap items-start gap-2 pr-12">
          {firstPendingInsertionItemId ? (
            <button
              type="button"
              onClick={() => focusPendingInsertionItem(firstPendingInsertionItemId)}
              className="inline-flex h-11 items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-4 text-sm font-medium text-amber-900 transition hover:bg-amber-100"
            >
              Go To Pending Event
            </button>
          ) : null}
        </div>

        <div className="absolute right-0 top-0 z-20 flex flex-wrap items-center justify-end gap-3">
          <TimelineDraftMenu
            onNewWindow={() => void handleOpenManuscriptWindow()}
            onSplitScreen={handleOpenManuscriptSplitScreen}
          />
        </div>

        <div className="pointer-events-none fixed bottom-5 left-5 z-40 hidden xl:block">
          <div
            className="pointer-events-auto relative"
            onPointerEnter={openZoomPopover}
            onPointerLeave={scheduleCloseZoomPopover}
            onFocusCapture={openZoomPopover}
            onBlurCapture={(event) => {
              const nextTarget = event.relatedTarget as Node | null;

              if (!event.currentTarget.contains(nextTarget)) {
                scheduleCloseZoomPopover();
              }
            }}
          >
            <button
              type="button"
              onClick={openZoomPopover}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-600 shadow-[0_16px_40px_-24px_rgba(24,24,27,0.5)] backdrop-blur transition hover:border-zinc-300 hover:text-zinc-950 focus-visible:border-zinc-300 focus-visible:text-zinc-950"
              aria-label="Show timeline zoom controls"
            >
              <ZoomIcon />
            </button>

            <div
              className={`absolute bottom-full left-0 mb-3 w-[19rem] transition-all duration-300 ${
                zoomPopoverOpen
                  ? "pointer-events-auto translate-y-0 opacity-100"
                  : "pointer-events-none translate-y-2 opacity-0"
              }`}
              onPointerEnter={openZoomPopover}
              onPointerLeave={scheduleCloseZoomPopover}
            >
              <div className="rounded-[1.6rem] border border-zinc-200 bg-white/92 px-4 py-3 shadow-[0_16px_40px_-24px_rgba(24,24,27,0.5)] backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Timeline zoom
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-xs font-medium text-zinc-500">{Math.round(timelineZoom)}%</span>
                  <input
                    type="range"
                    min={20}
                    max={100}
                    step={1}
                    value={timelineZoom}
                    onChange={(event) => setTimelineZoom(Number(event.target.value))}
                    className="h-2 w-44 cursor-pointer accent-zinc-950"
                    aria-label="Timeline zoom"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {stats.totalEvents === 0 ? (
          <TimelineStateCard>
            No timeline events exist in {activeProjectTitle} yet. Use the create button or the first
            insertion notch below to start the chronology.
          </TimelineStateCard>
        ) : null}

        {stats.totalEvents > 0 && timelineEvents.length === 0 ? (
          <TimelineStateCard>
            No timeline events match the current filters. Reset or adjust the filters to bring
            blocks back into view.
          </TimelineStateCard>
        ) : null}

        {(stats.totalEvents === 0 || timelineEvents.length > 0) && (
          <section className="pb-0">
            <div
              className="relative"
              style={{
                zoom: timelineDensity,
              }}
            >
              <div className="absolute bottom-10 left-6 top-10 w-px bg-linear-to-b from-zinc-300 via-zinc-200 to-zinc-300 md:left-1/2 md:-translate-x-1/2" />

              <div
                className="flex flex-col"
                style={{
                  gap: `${Math.round(16 * timelineDensity)}px`,
                }}
              >
                {layout.items.map((item) => {
                  if (item.kind === "event") {
                    return (
                      <TimelineEventRow
                        chapterLabelsById={chapterLabelsById}
                        key={item.id}
                        bookLabelsById={bookLabelsById}
                        eventItem={item}
                        isSelected={item.timelineEvent.id === selectedEventId}
                        onDelete={handleDeleteTimelineEvent}
                        onSaveSummaryDescription={handleUpdateEventCardSummaryDescription}
                        onSelect={focusEvent}
                        onView={openViewer}
                        onOpenBookmarkCollectionPicker={handleOpenBookmarkCollectionPicker}
                        registerRef={registerEventRef}
                        density={timelineDensity}
                        bookmarkAccentColor={activeBookmarkAccentColor}
                      />
                    );
                  }

                  if (item.kind === "gap") {
                    return (
                      <TimelineGapRow key={item.id} density={timelineDensity} gapItem={item} />
                    );
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
    );
  }

  if (isDraftSplitScreen) {
    return (
      <section
        className={`flex flex-1 flex-col bg-transparent ${
          isDraftSplitScreen ? "h-full overflow-hidden" : "min-h-[calc(100vh-6rem)]"
        }`}
      >
        {renderSplitShell(isScrollMode ? renderScrollSplitLeftPane() : renderTimelineSplitLeftPane())}
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
            activeProjectId={activeProjectId}
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
            onMultiFlowPublished={handleTimelineBrainDumpApproved}
            onManual={(nextInitialValues) => openCreateComposerFromFlow(nextInitialValues, null)}
            onMultiJobStarted={(jobId) => void handleMultiBrainDumpJobStarted(jobId)}
            onSingleReviewStateChange={handlePendingSingleReviewStateChange}
            onUseAiDraft={(draftState, nextInitialValues) =>
              openCreateComposerFromFlow(nextInitialValues, draftState)
            }
            timelineEvents={timelineEvents}
            uid={uid}
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

        {bookmarkPickerState ? (
          <TimelineBookmarkCollectionPicker
            collections={bookmarkCollections}
            initialCollectionId={bookmarkPickerState.currentCollectionId}
            open
            onClose={() => setBookmarkPickerState(null)}
            onSave={handleSaveBookmarkCollection}
          />
        ) : null}

        {activeEntityEditorSlice ? (
          <TimelineEntityEditorLightbox
            activeProjectId={activeProjectId}
            onClose={closeEntityEditor}
            sliceType={activeEntityEditorSlice}
            uid={uid}
          />
        ) : null}
      </section>
    );
  }

  return (
    <section
      className={`flex flex-1 flex-col bg-transparent ${
        isDraftSplitScreen
          ? "h-full overflow-hidden"
          : "min-h-[calc(100vh-6rem)]"
      }`}
    >
      {isScrollMode ? (
        <section className="flex min-h-0 flex-1 flex-col">
          {!isDraftSplitScreen ? renderWorkspaceControls(false) : null}

          <div className="flex flex-1 min-h-0 flex-col">
            {isDraftSplitScreen ? (
              <div className="relative grid h-full flex-1 min-h-0 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)]">
                <div
                  className={`flex h-full min-h-0 min-w-0 flex-col overflow-hidden ${
                    showSplitPaneShadows && effectiveActiveSplitPane === "scroll"
                      ? "relative z-10 shadow-[24px_0_60px_-42px_rgba(24,24,27,0.8)]"
                      : ""
                  }`}
                  onPointerEnter={() => setActiveSplitPane("scroll")}
                  onPointerDown={() => setActiveSplitPane("scroll")}
                >
                  <div className="flex-none">{renderWorkspaceControls(true)}</div>

                  <div
                    ref={splitScrollPaneRef}
                    className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-4 sm:px-6 sm:pt-4 sm:pb-4 xl:px-8 xl:pt-5 xl:pb-5"
                    onPointerEnter={() => setActiveSplitPane("scroll")}
                  >
                    <div className="mx-auto flex w-full max-w-none flex-col gap-4">
                      <div className="flex w-full flex-wrap items-start justify-between gap-3">
                        <div className="inline-flex rounded-full border border-zinc-200 bg-white/85 p-1 shadow-[0_12px_24px_-18px_rgba(24,24,27,0.4)] backdrop-blur">
                          {(["descriptions", "both", "summary"] as const).map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => handleScrollEventDisplayModeChange(mode)}
                              className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition ${
                                scrollEventDisplayMode === mode
                                  ? "bg-zinc-950 text-white shadow-sm"
                                  : "text-zinc-600 hover:text-zinc-950"
                              }`}
                            >
                              {mode === "descriptions"
                                ? "Descriptions"
                                : mode === "both"
                                  ? "Both"
                                  : "Summary"}
                            </button>
                          ))}
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-3">
                          <TimelineDraftMenu
                            onNewWindow={() => void handleOpenManuscriptWindow()}
                            onSplitScreen={handleOpenManuscriptSplitScreen}
                          />
                        </div>
                      </div>

                      {stats.totalEvents === 0 ? (
                        <TimelineStateCard>
                          No timeline events exist in {activeProjectTitle} yet. Use the insertion plus
                          at the top to start the chronology.
                        </TimelineStateCard>
                      ) : null}

                      {stats.totalEvents > 0 && timelineEvents.length === 0 ? (
                        <TimelineStateCard>
                          No timeline events match the current filters. Switch back to Timeline mode or
                          reset the filters to bring descriptions back into view.
                        </TimelineStateCard>
                      ) : null}

                      {timelineEvents.length > 0 || stats.totalEvents === 0 ? (
                        <div className="rounded-[2rem] border border-zinc-200/80 bg-white/70 shadow-[0_24px_70px_-52px_rgba(24,24,27,0.55)]">
                          <div>
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
                                          : visibleRestoredBrainDumpJobsByInsertionItemId[item.id] ??
                                            null
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
                                    onEditSummary={handleUpdateEventCardSummaryDescription}
                                    onEditEvent={openEditComposer}
                                    onOpenBookmarkCollectionPicker={
                                      handleOpenBookmarkCollectionPicker
                                    }
                                    displayMode={scrollEventDisplayMode}
                                    timelineEvent={item.timelineEvent}
                                    bookmarkAccentColor={activeBookmarkAccentColor}
                                  />
                                );
                              })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="hidden bg-zinc-300/70 lg:block" aria-hidden="true" />

                <div
                  className={`flex h-full min-h-0 min-w-0 flex-col overflow-hidden ${
                    showSplitPaneShadows && effectiveActiveSplitPane === "draft"
                      ? "relative z-10 shadow-[-24px_0_60px_-42px_rgba(24,24,27,0.8)]"
                      : ""
                  }`}
                  onPointerEnter={() => setActiveSplitPane("draft")}
                  onPointerDown={() => setActiveSplitPane("draft")}
                >
                  <ChapterDraftWorkspace
                    activeProjectId={activeProjectId}
                    layoutMode="embedded"
                    scrollContainerRef={splitDraftScrollContainerRef}
                    onCloseEmbedded={handleCloseManuscriptSplitScreen}
                    uid={uid}
                  />
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-6 sm:px-6 xl:px-8 xl:py-8">
                  <div className="inline-flex rounded-full border border-zinc-200 bg-white/85 p-1 shadow-[0_12px_24px_-18px_rgba(24,24,27,0.4)] backdrop-blur">
                    {(["descriptions", "both", "summary"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => handleScrollEventDisplayModeChange(mode)}
                        className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition ${
                          scrollEventDisplayMode === mode
                            ? "bg-zinc-950 text-white shadow-sm"
                            : "text-zinc-600 hover:text-zinc-950"
                        }`}
                      >
                        {mode === "descriptions"
                          ? "Descriptions"
                          : mode === "both"
                            ? "Both"
                            : "Summary"}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <TimelineDraftMenu
                      onNewWindow={() => void handleOpenManuscriptWindow()}
                      onSplitScreen={handleOpenManuscriptSplitScreen}
                    />
                  </div>
                </div>

                <div
                  ref={isDraftSplitScreen ? splitScrollPaneRef : undefined}
                  className={`flex-1 ${isDraftSplitScreen ? "min-h-0 overflow-y-auto overscroll-contain" : ""}`}
                >
                  <div className="min-w-0 px-4 py-6 sm:px-6 xl:px-8 xl:py-8">
                    <div className="pointer-events-none fixed bottom-5 left-5 z-40 hidden xl:block">
                      <div
                        className="pointer-events-auto relative"
                        onPointerEnter={openZoomPopover}
                        onPointerLeave={scheduleCloseZoomPopover}
                        onFocusCapture={openZoomPopover}
                        onBlurCapture={(event) => {
                          const nextTarget = event.relatedTarget as Node | null;

                          if (!event.currentTarget.contains(nextTarget)) {
                            scheduleCloseZoomPopover();
                          }
                        }}
                      >
                        <button
                          type="button"
                          onClick={openZoomPopover}
                          className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-600 shadow-[0_16px_40px_-24px_rgba(24,24,27,0.5)] backdrop-blur transition hover:border-zinc-300 hover:text-zinc-950 focus-visible:border-zinc-300 focus-visible:text-zinc-950"
                          aria-label="Show timeline zoom controls"
                        >
                          <ZoomIcon />
                        </button>

                        <div
                          className={`absolute bottom-full left-0 mb-3 w-[19rem] transition-all duration-300 ${
                            zoomPopoverOpen
                              ? "pointer-events-auto translate-y-0 opacity-100"
                              : "pointer-events-none translate-y-2 opacity-0"
                          }`}
                          onPointerEnter={openZoomPopover}
                          onPointerLeave={scheduleCloseZoomPopover}
                        >
                          <div className="rounded-[1.6rem] border border-zinc-200 bg-white/92 px-4 py-3 shadow-[0_16px_40px_-24px_rgba(24,24,27,0.5)] backdrop-blur">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                              Timeline zoom
                            </p>
                            <div className="mt-3 flex items-center gap-3">
                              <span className="text-xs font-medium text-zinc-500">
                                {Math.round(timelineZoom)}%
                              </span>
                              <input
                                type="range"
                                min={20}
                                max={100}
                                step={1}
                                value={timelineZoom}
                                onChange={(event) => setTimelineZoom(Number(event.target.value))}
                                className="h-2 w-44 cursor-pointer accent-zinc-950"
                                aria-label="Timeline zoom"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
                      {stats.totalEvents === 0 ? (
                        <TimelineStateCard>
                          No timeline events exist in {activeProjectTitle} yet. Use the insertion plus
                          at the top to start the chronology.
                        </TimelineStateCard>
                      ) : null}

                      {stats.totalEvents > 0 && timelineEvents.length === 0 ? (
                        <TimelineStateCard>
                          No timeline events match the current filters. Switch back to Timeline mode
                          or reset the filters to bring descriptions back into view.
                        </TimelineStateCard>
                      ) : null}

                      {timelineEvents.length > 0 || stats.totalEvents === 0 ? (
                        <div className="rounded-[2rem] border border-zinc-200/80 bg-white/70 shadow-[0_24px_70px_-52px_rgba(24,24,27,0.55)]">
                          <div>
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
                                          : visibleRestoredBrainDumpJobsByInsertionItemId[item.id] ??
                                            null
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
                                    onEditSummary={handleUpdateEventCardSummaryDescription}
                                    onEditEvent={openEditComposer}
                                    onOpenBookmarkCollectionPicker={handleOpenBookmarkCollectionPicker}
                                    displayMode={scrollEventDisplayMode}
                                    timelineEvent={item.timelineEvent}
                                    bookmarkAccentColor={activeBookmarkAccentColor}
                                  />
                                );
                              })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="flex min-h-0 flex-1 flex-col">
          {!isDraftSplitScreen ? renderWorkspaceControls(false) : null}

          {!isDraftSplitScreen ? (
            <div className="flex justify-end px-4 py-6 sm:px-6 xl:px-8 xl:py-8">
              <TimelineDraftMenu
                onNewWindow={() => void handleOpenManuscriptWindow()}
                onSplitScreen={handleOpenManuscriptSplitScreen}
              />
            </div>
          ) : null}

          <div
            className={
              isDraftSplitScreen
                ? "relative grid h-full flex-1 min-h-0 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)]"
                : "flex-1"
            }
          >
            <div
              className={
                isDraftSplitScreen
                  ? `flex h-full min-h-0 min-w-0 flex-col overflow-hidden ${
                      showSplitPaneShadows && effectiveActiveSplitPane === "scroll"
                        ? "relative z-10 shadow-[24px_0_60px_-42px_rgba(24,24,27,0.8)]"
                        : ""
                    }`
                  : "min-w-0 px-4 py-6 sm:px-6 xl:px-8 xl:py-8"
              }
              onPointerEnter={isDraftSplitScreen ? () => setActiveSplitPane("scroll") : undefined}
              onPointerDown={isDraftSplitScreen ? () => setActiveSplitPane("scroll") : undefined}
            >
              {isDraftSplitScreen ? <div className="flex-none">{renderWorkspaceControls(true)}</div> : null}

              <div
                ref={isDraftSplitScreen ? splitScrollPaneRef : undefined}
                className={
                  isDraftSplitScreen
                    ? "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6 xl:px-8 xl:py-8"
                    : ""
                }
              >
                {isDraftSplitScreen ? (
                  <div className="mx-auto flex w-full max-w-none flex-col gap-6">
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
                      <section className="pb-4">
                        <div
                          className="relative"
                          style={{
                            zoom: timelineDensity,
                          }}
                        >
                          <div className="absolute bottom-10 left-6 top-10 w-px bg-linear-to-b from-zinc-300 via-zinc-200 to-zinc-300 md:left-1/2 md:-translate-x-1/2" />

                          <div
                            className="flex flex-col"
                            style={{
                              gap: `${Math.round(16 * timelineDensity)}px`,
                            }}
                          >
                            {layout.items.map((item) => {
                              if (item.kind === "event") {
                                return (
                                <TimelineEventRow
                                  chapterLabelsById={chapterLabelsById}
                                  key={item.id}
                                  bookLabelsById={bookLabelsById}
                                  eventItem={item}
                                  isSelected={item.timelineEvent.id === selectedEventId}
                                  onDelete={handleDeleteTimelineEvent}
                                  onSaveSummaryDescription={handleUpdateEventCardSummaryDescription}
                                  onSelect={focusEvent}
                                  onView={openViewer}
                                  onOpenBookmarkCollectionPicker={handleOpenBookmarkCollectionPicker}
                                  registerRef={registerEventRef}
                                  density={timelineDensity}
                                  bookmarkAccentColor={activeBookmarkAccentColor}
                                />
                              );
                              }

                              if (item.kind === "gap") {
                                return (
                                  <TimelineGapRow
                                    key={item.id}
                                    density={timelineDensity}
                                    gapItem={item}
                                  />
                                );
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
                ) : (
                  <>
                    <div className="pointer-events-none fixed bottom-5 left-5 z-40 hidden xl:block">
                      <div
                        className="pointer-events-auto relative"
                        onPointerEnter={openZoomPopover}
                        onPointerLeave={scheduleCloseZoomPopover}
                        onFocusCapture={openZoomPopover}
                        onBlurCapture={(event) => {
                          const nextTarget = event.relatedTarget as Node | null;

                          if (!event.currentTarget.contains(nextTarget)) {
                            scheduleCloseZoomPopover();
                          }
                        }}
                      >
                        <button
                          type="button"
                          onClick={openZoomPopover}
                          className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-600 shadow-[0_16px_40px_-24px_rgba(24,24,27,0.5)] backdrop-blur transition hover:border-zinc-300 hover:text-zinc-950 focus-visible:border-zinc-300 focus-visible:text-zinc-950"
                          aria-label="Show timeline zoom controls"
                        >
                          <ZoomIcon />
                        </button>

                        <div
                          className={`absolute bottom-full left-0 mb-3 w-[19rem] transition-all duration-300 ${
                            zoomPopoverOpen
                              ? "pointer-events-auto translate-y-0 opacity-100"
                              : "pointer-events-none translate-y-2 opacity-0"
                          }`}
                          onPointerEnter={openZoomPopover}
                          onPointerLeave={scheduleCloseZoomPopover}
                        >
                          <div className="rounded-[1.6rem] border border-zinc-200 bg-white/92 px-4 py-3 shadow-[0_16px_40px_-24px_rgba(24,24,27,0.5)] backdrop-blur">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                              Timeline zoom
                            </p>
                            <div className="mt-3 flex items-center gap-3">
                              <span className="text-xs font-medium text-zinc-500">
                                {Math.round(timelineZoom)}%
                              </span>
                              <input
                                type="range"
                                min={20}
                                max={100}
                                step={1}
                                value={timelineZoom}
                                onChange={(event) => setTimelineZoom(Number(event.target.value))}
                                className="h-2 w-44 cursor-pointer accent-zinc-950"
                                aria-label="Timeline zoom"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mx-auto flex w-full max-w-none flex-col gap-4">
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
                        <section className="pb-4">
                          <div
                            className="relative"
                            style={{
                              zoom: timelineDensity,
                            }}
                          >
                            <div className="absolute bottom-10 left-6 top-10 w-px bg-linear-to-b from-zinc-300 via-zinc-200 to-zinc-300 md:left-1/2 md:-translate-x-1/2" />

                            <div
                              className="flex flex-col"
                              style={{
                              gap: `${Math.round(16 * timelineDensity)}px`,
                              }}
                            >
                              {layout.items.map((item) => {
                                if (item.kind === "event") {
                                  return (
                                    <TimelineEventRow
                                      chapterLabelsById={chapterLabelsById}
                                      key={item.id}
                                      bookLabelsById={bookLabelsById}
                                      eventItem={item}
                                      isSelected={item.timelineEvent.id === selectedEventId}
                                      onDelete={handleDeleteTimelineEvent}
                                      onSaveSummaryDescription={handleUpdateEventCardSummaryDescription}
                                      onSelect={focusEvent}
                                      onView={openViewer}
                                      onOpenBookmarkCollectionPicker={handleOpenBookmarkCollectionPicker}
                                      registerRef={registerEventRef}
                                      density={timelineDensity}
                                      bookmarkAccentColor={activeBookmarkAccentColor}
                                    />
                                  );
                                }

                                if (item.kind === "gap") {
                                  return (
                                    <TimelineGapRow
                                      key={item.id}
                                      density={timelineDensity}
                                      gapItem={item}
                                    />
                                  );
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
                  </>
                )}
              </div>
            </div>
            {isDraftSplitScreen ? (
              <>
                <div className="hidden bg-zinc-300/70 lg:block" aria-hidden="true" />
                <div
                  className={`flex h-full min-h-0 min-w-0 flex-col overflow-hidden ${
                    showSplitPaneShadows && effectiveActiveSplitPane === "draft"
                      ? "relative z-10 shadow-[-24px_0_60px_-42px_rgba(24,24,27,0.8)]"
                      : ""
                  }`}
                  onPointerEnter={() => setActiveSplitPane("draft")}
                  onPointerDown={() => setActiveSplitPane("draft")}
                >
                  <ChapterDraftWorkspace
                    activeProjectId={activeProjectId}
                    layoutMode="embedded"
                    scrollContainerRef={splitDraftScrollContainerRef}
                    onCloseEmbedded={handleCloseManuscriptSplitScreen}
                    uid={uid}
                  />
                </div>
              </>
            ) : null}
          </div>
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
            activeProjectId={activeProjectId}
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
            onMultiFlowPublished={handleTimelineBrainDumpApproved}
            onManual={(nextInitialValues) => openCreateComposerFromFlow(nextInitialValues, null)}
            onMultiJobStarted={(jobId) => void handleMultiBrainDumpJobStarted(jobId)}
            onSingleReviewStateChange={handlePendingSingleReviewStateChange}
            onUseAiDraft={(draftState, nextInitialValues) =>
              openCreateComposerFromFlow(nextInitialValues, draftState)
            }
            timelineEvents={timelineEvents}
            uid={uid}
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

      {bookmarkPickerState ? (
        <TimelineBookmarkCollectionPicker
          collections={bookmarkCollections}
          initialCollectionId={bookmarkPickerState.currentCollectionId}
          open
          onClose={() => setBookmarkPickerState(null)}
          onSave={handleSaveBookmarkCollection}
        />
      ) : null}

      {activeEntityEditorSlice ? (
        <TimelineEntityEditorLightbox
          activeProjectId={activeProjectId}
          onClose={closeEntityEditor}
          sliceType={activeEntityEditorSlice}
          uid={uid}
        />
      ) : null}
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
    yearStart: "",
    monthStart: "",
    dayStart: "",
    yearEnd: "",
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

function TimelineEventRow({
  chapterLabelsById,
  bookLabelsById,
  compact = false,
  eventItem,
  density,
  bookmarkAccentColor,
  isSelected,
  onDelete,
  onSaveSummaryDescription,
  onSelect,
  onOpenBookmarkCollectionPicker,
  onView,
  registerRef,
}: {
  chapterLabelsById: ReadonlyMap<string, string>;
  bookLabelsById: ReadonlyMap<string, string>;
  compact?: boolean;
  eventItem: TimelineLayoutEventItem;
  density: number;
  bookmarkAccentColor?: string | null;
  isSelected: boolean;
  onDelete: (timelineEvent: TimelineEvent) => Promise<void>;
  onSaveSummaryDescription: (
    timelineEventId: string,
    payload: { summary: string; description: string }
  ) => Promise<void>;
  onSelect: (eventId: string) => void;
  onOpenBookmarkCollectionPicker: (timelineEvent: TimelineEvent) => void;
  onView: (eventId: string) => void;
  registerRef: (eventId: string, node: HTMLDivElement | null) => void;
}) {
  const isLeft = eventItem.side === "left";

  return (
    <div
      ref={(node) => registerRef(eventItem.timelineEvent.id, node)}
      className={`relative grid ${
        compact
          ? "gap-3 md:grid-cols-[minmax(0,1fr)_4rem_minmax(0,1fr)]"
          : "gap-4 md:grid-cols-[minmax(0,1fr)_5rem_minmax(0,1fr)]"
      } md:items-start`}
    >
      <div
        className={`${
          compact ? "pl-12" : "pl-16"
        } md:pl-0 ${
          isLeft ? "md:col-start-1 md:justify-self-end" : "md:col-start-3 md:justify-self-start"
        }`}
      >
        <TimelineWorkspaceEventCard
          chapterLabelsById={chapterLabelsById}
          bookLabelsById={bookLabelsById}
          onDelete={onDelete}
          onSaveSummaryDescription={onSaveSummaryDescription}
          onOpenBookmarkCollectionPicker={onOpenBookmarkCollectionPicker}
          onView={onView}
          position={eventItem.position}
          selected={isSelected}
          timelineEvent={eventItem.timelineEvent}
          density={density}
          bookmarkAccentColor={bookmarkAccentColor}
        />
      </div>

      <div className="absolute left-6 top-8 flex -translate-x-1/2 justify-center md:static md:col-start-2 md:row-start-1 md:translate-x-0">
        <button
          type="button"
          onClick={() => onSelect(eventItem.timelineEvent.id)}
          className={`flex items-center justify-center rounded-full border-4 px-2 font-semibold tabular-nums transition ${
            compact ? "min-h-10 min-w-10 text-[0.95rem]" : "min-h-12 min-w-12 text-sm"
          } ${
            isSelected
              ? "border-zinc-200 bg-zinc-950 text-white"
              : "border-white bg-zinc-300 text-zinc-950 hover:bg-zinc-400"
          }`}
          aria-label={`Focus ${eventItem.timelineEvent.title}`}
          style={
            isSelected
              ? {
                  backgroundColor: TIMELINE_SELECTION_ACCENT,
                  borderColor: TIMELINE_SELECTION_ACCENT,
                  color: "#ffffff",
                  boxShadow: `0 0 0 4px rgba(200, 106, 46, 0.18), 0 0 0 8px rgba(200, 106, 46, 0.08), 0 10px 24px -10px rgba(200, 106, 46, 0.35)`,
                }
              : undefined
          }
        >
          {eventItem.position}
        </button>
      </div>
    </div>
  );
}

function TimelineGapRow({
  density,
  gapItem,
}: {
  density: number;
  gapItem: TimelineLayoutGapItem;
}) {
  return (
    <div
      className="relative"
      style={{
        height: `${Math.round(gapItem.heightPx * density)}px`,
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
          streamlined={compact}
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
  compact = false,
  displayMode,
  onEditDescription,
  onEditSummary,
  onEditEvent,
  onOpenBookmarkCollectionPicker,
  bookmarkAccentColor,
  timelineEvent,
}: {
  compact?: boolean;
  displayMode: "descriptions" | "both" | "summary";
  onEditDescription: (
    timelineEventId: string,
    payload: { summary: string; description: string }
  ) => Promise<void>;
  onEditSummary: (
    timelineEventId: string,
    payload: { summary: string; description: string }
  ) => Promise<void>;
  onEditEvent: (timelineEventId: string) => void;
  onOpenBookmarkCollectionPicker: (timelineEvent: TimelineEvent) => void;
  bookmarkAccentColor?: string | null;
  timelineEvent: TimelineEvent;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingField, setEditingField] = useState<"summary" | "description" | null>(null);
  const [draftSummary, setDraftSummary] = useState(timelineEvent.summary);
  const [draftDescription, setDraftDescription] = useState(timelineEvent.description);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const summaryEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const descriptionEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const normalizedSummary = timelineEvent.summary.trim();
  const normalizedDescription = timelineEvent.description.trim();
  const isBookmarked = isTimelineEventBookmarked(timelineEvent);
  const hasBookmarkAccent = typeof bookmarkAccentColor === "string";
  const bookmarkColor = bookmarkAccentColor ?? "#f59e0b";

  useEffect(() => {
    setDraftSummary(timelineEvent.summary);
    setDraftDescription(timelineEvent.description);
    setEditingField(null);
    setMenuOpen(false);
    setSaveError(null);
  }, [timelineEvent.description, timelineEvent.id]);

  useEffect(() => {
    if (!menuOpen && !editingField) {
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
        setEditingField(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [editingField, menuOpen]);

  useEffect(() => {
    if (editingField !== "description") {
      return;
    }

    const textarea = descriptionEditorRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [draftDescription, editingField]);

  useEffect(() => {
    if (editingField !== "summary") {
      return;
    }

    const textarea = summaryEditorRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [draftSummary, editingField]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaveError(null);

    try {
      if (editingField === "summary") {
        await onEditSummary(timelineEvent.id, {
          summary: draftSummary,
          description: timelineEvent.description,
        });
      } else if (editingField === "description") {
        await onEditDescription(timelineEvent.id, {
          summary: timelineEvent.summary,
          description: draftDescription,
        });
      }

      setEditingField(null);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to update this event.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article
      ref={containerRef}
      className={`relative ${compact ? "px-4 py-4 sm:px-5" : "px-5 py-6 sm:px-6"}`}
    >
      <div className="absolute right-4 top-1 z-20 -translate-y-1/2">
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-none border-0 bg-transparent text-zinc-500 shadow-none transition hover:text-zinc-800"
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
                setEditingField("summary");
              }}
              className="block w-full px-4 py-3 text-left text-sm text-zinc-700 transition hover:bg-zinc-50"
            >
              Edit Summary
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onOpenBookmarkCollectionPicker(timelineEvent);
              }}
              className="block w-full px-4 py-3 text-left text-sm text-zinc-700 transition hover:bg-zinc-50"
            >
              {isBookmarked ? "Edit Bookmark Collection" : "Bookmark"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setEditingField("description");
              }}
              className="block w-full px-4 py-3 text-left text-sm text-zinc-700 transition hover:bg-zinc-50"
            >
              Edit Description
            </button>
          </div>
        ) : null}
      </div>

      <div
        className={`transition ${compact ? "pr-12" : "pr-14"} ${
          isBookmarked
            ? "rounded-[2rem] border border-zinc-200 bg-zinc-50/60 px-5 py-4"
            : ""
        }`}
        style={
          isBookmarked
            ? hasBookmarkAccent
              ? {
                  backgroundColor: hexToRgba(bookmarkColor, 0.04),
                  boxShadow: `0 0 0 4px ${bookmarkColor}, 0 0 0 5px ${hexToRgba(
                    bookmarkColor,
                    0.22
                  )}, 0 0 34px ${hexToRgba(bookmarkColor, 0.16)}`,
                }
              : {
                  backgroundColor: "rgba(244, 244, 245, 0.7)",
                  boxShadow:
                    "0 0 0 1px rgba(228, 228, 231, 0.95), 0 16px 32px -24px rgba(24,24,27,0.24)",
                }
            : undefined
        }
      >
        {editingField ? (
          <form onSubmit={handleSave}>
            <label className="block">
              <span className="sr-only">
                {editingField === "summary" ? "Edit summary" : "Edit description"}
              </span>
              <textarea
                ref={editingField === "summary" ? summaryEditorRef : descriptionEditorRef}
                value={editingField === "summary" ? draftSummary : draftDescription}
                onChange={(event) =>
                  editingField === "summary"
                    ? setDraftSummary(event.target.value)
                    : setDraftDescription(event.target.value)
                }
                className={`w-full resize-none overflow-hidden rounded-3xl border border-zinc-200 bg-white px-4 py-4 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-950/10 ${
                  editingField === "summary"
                    ? "min-h-28 text-[1.03rem] font-semibold leading-7 text-zinc-950"
                    : "min-h-40 font-serif text-[1.02rem] leading-8 text-zinc-900"
                }`}
                placeholder={
                  editingField === "summary"
                    ? "Write the event summary."
                    : "Write the event description."
                }
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
                disabled={saving}
                className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingField(null);
                  setDraftSummary(timelineEvent.summary);
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
          <div className={compact ? "space-y-3" : "space-y-4"}>
            {displayMode !== "descriptions" ? (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Summary
                </p>
                <p className="mt-2 text-[1.03rem] font-semibold leading-7 text-zinc-950">
                  {normalizedSummary || "No summary yet."}
                </p>
              </div>
            ) : null}

            {displayMode !== "summary" ? (
              <div>
                {displayMode === "both" ? (
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Description
                  </p>
                ) : null}
                <p className="mt-2 whitespace-pre-wrap font-serif text-[1.02rem] leading-8 text-zinc-900">
                  {normalizedDescription || "No description yet."}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>
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

function findDuplicateValues(values: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
      continue;
    }

    seen.add(value);
  }

  return Array.from(duplicates);
}

function ZoomIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="7" cy="7" r="4.5" />
      <path d="m10.5 10.5 2.8 2.8" />
      <path d="M7 5.1v3.8" />
      <path d="M5.1 7h3.8" />
    </svg>
  );
}

function TimelineBrainDumpReviewLightbox({
  activeProjectId,
  job,
  onApproved,
  onClose,
  onJobReplaced,
  streamlined,
  uid,
}: {
  activeProjectId: string;
  job: AiMultiEventJobRecord;
  onApproved: () => Promise<void> | void;
  onClose: () => void;
  onJobReplaced: (jobId: string, job: AiMultiEventJobRecord | null) => void;
  streamlined: boolean;
  uid: string;
}) {
  const [rerunning, setRerunning] = useState(false);
  const [rerunError, setRerunError] = useState<string | null>(null);
  useScrollLock(true);

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
    <div className="fixed inset-0 z-[70] overflow-y-auto overscroll-contain bg-zinc-950/45 px-4 py-6 backdrop-blur-sm">
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

        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto overscroll-contain px-6 py-6">
          <TimelineBrainDumpJobReview
            activeProjectId={activeProjectId}
            job={job}
            onApproved={onApproved}
            onRerun={handleRerunBrainDump}
            rerunning={rerunning}
            streamlined={streamlined}
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
  useScrollLock(true);

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
    <div className="fixed inset-0 z-[70] overflow-y-auto overscroll-contain bg-zinc-950/45 px-4 py-6 backdrop-blur-sm">
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

        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto overscroll-contain px-6 py-6">
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
  useScrollLock(true);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain bg-zinc-950/45 px-4 py-6 backdrop-blur-sm">
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
