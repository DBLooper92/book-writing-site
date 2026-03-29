"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { TimelineBrainDumpLightbox } from "@/components/timeline/timeline-brain-dump-lightbox";
import { TimelineEventComposerSheet } from "@/components/timeline/timeline-event-composer-sheet";
import { TimelineEventDetailLightbox } from "@/components/timeline/timeline-event-detail-lightbox";
import { TimelineWorkspaceControls } from "@/components/timeline/timeline-workspace-controls";
import { TimelineWorkspaceEventCard } from "@/components/timeline/timeline-workspace-event-card";
import { useTimelineFormOptions } from "@/hooks/use-timeline-form-options";
import {
  buildTimelineLayoutModel,
  type TimelineLayoutEventItem,
  type TimelineLayoutGapItem,
  type TimelineLayoutInsertionItem,
} from "@/lib/timeline/layout";
import {
  buildTimelineCreateHref,
  buildTimelineCreateInitialValuesFromSearchParams,
  clearTimelineCreateSearchParams,
  hasTimelineCreateSearchParams,
} from "@/lib/timeline/create-route";
import {
  type TimelineWorkspaceFilters,
  type TimelineWorkspaceStats,
} from "@/lib/timeline/workspace";
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
  const [requestedSelectedEventId, setRequestedSelectedEventId] = useState<string | null>(null);
  const [viewerEventId, setViewerEventId] = useState<string | null>(null);
  const [brainDumpOpen, setBrainDumpOpen] = useState(false);
  const [localComposerState, setLocalComposerState] = useState<
    | {
        initialValuesOverride?: TimelineEventFormValues | null;
        insertionItem: TimelineLayoutInsertionItem | null;
        mode: "create";
        source: "local" | "url";
      }
    | { mode: "edit"; source: "local"; timelineEventId: string }
    | null
  >(null);
  const eventRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const knownTimelineEventIds = new Set(timelineEvents.map((timelineEvent) => timelineEvent.id));
  const formOptions = useTimelineFormOptions();
  const layout = buildTimelineLayoutModel(timelineEvents);
  const requestedCreateComposer = hasTimelineCreateSearchParams(searchParams);
  const searchParamsKey = searchParams.toString();
  const composerState = requestedCreateComposer
    ? {
        initialValuesOverride: buildTimelineCreateInitialValuesFromSearchParams(searchParams),
        insertionItem: null,
        mode: "create" as const,
        source: "url" as const,
      }
    : localComposerState;
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

  function registerEventRef(eventId: string, node: HTMLDivElement | null) {
    if (node) {
      eventRefs.current.set(eventId, node);
      return;
    }

    eventRefs.current.delete(eventId);
  }

  function focusEvent(eventId: string) {
    setRequestedSelectedEventId(eventId);
    eventRefs.current.get(eventId)?.scrollIntoView({
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

  function closeComposer() {
    const shouldClearCreateQuery = composerState?.mode === "create" && composerState.source === "url";

    setLocalComposerState(null);

    if (!shouldClearCreateQuery) {
      return;
    }

    const nextSearchParams = clearTimelineCreateSearchParams(new URLSearchParams(searchParamsKey));
    const nextQueryString = nextSearchParams.toString();
    router.replace(nextQueryString ? `${pathname}?${nextQueryString}` : pathname, {
      scroll: false,
    });
  }

  const filterBarClassName = filtersPinned
    ? "xl:sticky xl:top-0 xl:z-20 xl:shadow-[0_18px_45px_-36px_rgba(24,24,27,0.55)]"
    : "";

  return (
    <>
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
                  No visible blocks yet. Create a timeline event or loosen the filters to rebuild
                  the quick map.
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
              onChange={onChange}
              onReset={onReset}
              onTogglePinned={() => setFiltersPinned((current) => !current)}
            />
          </div>

          <div className="space-y-6 p-4 sm:p-6 xl:p-8">
            <div className="flex justify-end">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setBrainDumpOpen(true)}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                >
                  Brain dump
                </button>
                <Link
                  href={buildTimelineCreateHref()}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
                >
                  Create timeline event
                </Link>
              </div>
            </div>

            {stats.totalEvents === 0 ? (
              <TimelineStateCard>
                No timeline events exist in {activeProjectTitle} yet. Use the create button or the
                first insertion notch below to start the chronology.
              </TimelineStateCard>
            ) : null}

            {stats.totalEvents > 0 && timelineEvents.length === 0 ? (
              <TimelineStateCard>
                No timeline events match the current filters. Reset or adjust the filters to bring
                blocks back into view.
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
                            key={item.id}
                            eventItem={item}
                            isSelected={item.timelineEvent.id === selectedEventId}
                            onSelect={focusEvent}
                            onView={openViewer}
                            registerRef={registerEventRef}
                          />
                        );
                      }

                      if (item.kind === "gap") {
                        return <TimelineGapRow key={item.id} gapItem={item} />;
                      }

                      return (
                        <TimelineInsertionRow
                          key={item.id}
                          insertionItem={item}
                          onOpenComposer={(nextInsertionItem) =>
                            setLocalComposerState({
                              initialValuesOverride: null,
                              mode: "create",
                              insertionItem: nextInsertionItem,
                              source: "local",
                            })
                          }
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

      {composerState ? (
        <TimelineEventComposerSheet
          activeProjectId={activeProjectId}
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

      {brainDumpOpen ? (
        <TimelineBrainDumpLightbox
          activeProjectId={activeProjectId}
          activeProjectTitle={activeProjectTitle}
          onClose={() => setBrainDumpOpen(false)}
          onSuccess={(aiSessionId) => {
            setBrainDumpOpen(false);
            router.push(`/ai-sessions/${aiSessionId}`);
          }}
        />
      ) : null}

      {viewingTimelineEvent && availableReferenceMaps && availableReferenceSets ? (
        <TimelineEventDetailLightbox
          knownTimelineEventIds={knownTimelineEventIds}
          onClose={() => setViewerEventId(null)}
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

function TimelineStateCard({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-zinc-300 bg-zinc-50 px-5 py-4 text-sm leading-6 text-zinc-600">
      {children}
    </section>
  );
}

function TimelineEventRow({
  eventItem,
  isSelected,
  onSelect,
  onView,
  registerRef,
}: {
  eventItem: TimelineLayoutEventItem;
  isSelected: boolean;
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
  insertionItem,
  onOpenComposer,
}: {
  insertionItem: TimelineLayoutInsertionItem;
  onOpenComposer: (insertionItem: TimelineLayoutInsertionItem) => void;
}) {
  return (
    <div className="relative grid gap-3 md:grid-cols-[minmax(0,1fr)_5rem_minmax(0,1fr)] md:items-center">
      <div className="pl-16 text-left md:col-span-3 md:pl-0 md:text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          {insertionItem.label}
        </p>
        <p className="mt-2 text-sm leading-6 text-zinc-600">{insertionItem.helperText}</p>
      </div>

      <div className="absolute left-6 top-1/2 flex -translate-x-1/2 -translate-y-1/2 justify-center md:static md:col-start-2 md:row-start-1 md:translate-x-0 md:translate-y-0">
        <button
          type="button"
          onClick={() => onOpenComposer(insertionItem)}
          className="flex h-11 w-11 items-center justify-center rounded-full border-4 border-white bg-zinc-950 text-xl font-semibold text-white shadow-sm transition hover:bg-zinc-800"
          aria-label={insertionItem.label}
        >
          +
        </button>
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
