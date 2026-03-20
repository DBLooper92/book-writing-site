"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { TimelineEventComposerSheet } from "@/components/timeline/timeline-event-composer-sheet";
import { TimelineWorkspaceEventCard } from "@/components/timeline/timeline-workspace-event-card";
import { useTimelineFormOptions } from "@/hooks/use-timeline-form-options";
import {
  buildTimelineInsertionHref,
  buildTimelineLayoutModel,
  type TimelineLayoutEventItem,
  type TimelineLayoutGapItem,
  type TimelineLayoutInsertionItem,
} from "@/lib/timeline/layout";
import {
  buildTimelineLinkedReferenceGroups,
  type TimelineLinkedReferenceGroup,
} from "@/lib/timeline/references";
import {
  formatDetailedTimelineEventRange,
  formatTimelineEventBoundaryLabel,
  formatTimelineEnumValue,
  formatTimelineEventSequenceLabel,
  getTimelineEventChronologyLabel,
  getTimelineWorkspaceIssues,
} from "@/lib/timeline/workspace";
import type { TimelineEvent } from "@/types/timeline-event";

type TimelineWorkspaceVisualProps = {
  activeProjectId: string;
  timelineEvents: TimelineEvent[];
  uid: string;
};

export function TimelineWorkspaceVisual({
  activeProjectId,
  timelineEvents,
  uid,
}: TimelineWorkspaceVisualProps) {
  const [requestedSelectedEventId, setRequestedSelectedEventId] = useState<string | null>(null);
  const [composerState, setComposerState] = useState<
    | { mode: "create"; insertionItem: TimelineLayoutInsertionItem | null }
    | { mode: "edit"; timelineEventId: string }
    | null
  >(null);
  const eventRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const knownTimelineEventIds = new Set(timelineEvents.map((timelineEvent) => timelineEvent.id));
  const formOptions = useTimelineFormOptions();
  const layout = buildTimelineLayoutModel(timelineEvents);
  const selectedEventId =
    requestedSelectedEventId &&
    timelineEvents.some((timelineEvent) => timelineEvent.id === requestedSelectedEventId)
      ? requestedSelectedEventId
      : timelineEvents[0]?.id ?? null;
  const selectedTimelineEvent =
    timelineEvents.find((timelineEvent) => timelineEvent.id === selectedEventId) ?? null;
  const editingTimelineEvent =
    composerState?.mode === "edit"
      ? timelineEvents.find((timelineEvent) => timelineEvent.id === composerState.timelineEventId) ??
        null
      : null;
  const selectedIssues =
    selectedTimelineEvent && !formOptions.loading && !formOptions.error
      ? getTimelineWorkspaceIssues(
          selectedTimelineEvent,
          knownTimelineEventIds,
          formOptions.referenceSets
        )
      : [];
  const selectedGroups =
    selectedTimelineEvent && !formOptions.loading && !formOptions.error
      ? buildTimelineLinkedReferenceGroups(selectedTimelineEvent, formOptions.referenceMaps)
      : [];
  const availableReferenceMaps =
    !formOptions.loading && !formOptions.error ? formOptions.referenceMaps : null;
  const availableReferenceSets =
    !formOptions.loading && !formOptions.error ? formOptions.referenceSets : null;
  const selectedChronologyLabel = selectedTimelineEvent
    ? getTimelineEventChronologyLabel(selectedTimelineEvent)
    : null;
  const selectedDetailedRange = selectedTimelineEvent
    ? formatDetailedTimelineEventRange(selectedTimelineEvent)
    : null;
  const selectedStartDate = selectedTimelineEvent
    ? formatTimelineEventBoundaryLabel(selectedTimelineEvent, "start")
    : null;
  const selectedEndDate = selectedTimelineEvent
    ? formatTimelineEventBoundaryLabel(selectedTimelineEvent, "end")
    : null;
  const selectedSequenceLabel = selectedTimelineEvent
    ? formatTimelineEventSequenceLabel(selectedTimelineEvent)
    : null;
  const showSelectedDetailedRange =
    !!selectedTimelineEvent &&
    selectedChronologyLabel !== selectedDetailedRange &&
    selectedTimelineEvent.displayDateLabel.trim().length > 0;

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

  function handleSaved(timelineEventId: string) {
    setRequestedSelectedEventId(timelineEventId);
    setComposerState(null);
  }

  return (
    <>
      <section className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm xl:sticky xl:top-6 xl:self-start">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Quick map
              </p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight text-zinc-950">
                Timeline blocks
              </h2>
            </div>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
              {layout.quickNavItems.length}
            </span>
          </div>

          <p className="mt-3 text-sm leading-6 text-zinc-600">
            Dense event index for fast jumping while the main line stays visually spaced.
          </p>

          <div className="mt-5 max-h-[70vh] space-y-2 overflow-y-auto pr-1">
            {layout.quickNavItems.map((quickNavItem) => {
              const isSelected = quickNavItem.eventId === selectedEventId;

              return (
                <button
                  key={quickNavItem.eventId}
                  type="button"
                  onClick={() => focusEvent(quickNavItem.eventId)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    isSelected
                      ? "border-amber-300 bg-amber-50 text-zinc-950"
                      : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-white"
                  }`}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    {quickNavItem.chronologyLabel}
                  </p>
                  <p className="mt-1 text-sm font-semibold tracking-tight">{quickNavItem.title}</p>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-600">
                    {quickNavItem.summary || "No summary yet."}
                  </p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                    {formatTimelineEnumValue(quickNavItem.status)}
                  </p>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="rounded-4xl border border-zinc-200 bg-[linear-gradient(180deg,#fffdf8_0%,#ffffff_45%,#fffdf7_100%)] p-6 shadow-sm md:p-8">
          <div className="mb-6 flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Core chronology
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
                  Visual timeline
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
                  Blank notches are insertion points. Large jumps compress into labeled time skips
                  so long histories stay readable without losing chronological context.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setComposerState({ mode: "create", insertionItem: null })}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
                >
                  Create timeline event
                </button>
                {selectedTimelineEvent ? (
                  <button
                    type="button"
                    onClick={() =>
                      setComposerState({
                        mode: "edit",
                        timelineEventId: selectedTimelineEvent.id,
                      })
                    }
                    className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                  >
                    Edit selected block
                  </button>
                ) : null}
              </div>
            </div>

            {selectedTimelineEvent ? (
              <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-900">
                  Selected block
                </p>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold tracking-tight text-zinc-950">
                      {selectedTimelineEvent.title}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-zinc-700">
                      {selectedTimelineEvent.summary || "No summary yet."}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-600">
                      <span className="rounded-full bg-white px-3 py-1 ring-1 ring-amber-200">
                        {selectedChronologyLabel}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 ring-1 ring-amber-200">
                        {formatTimelineEnumValue(selectedTimelineEvent.eventType)}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 ring-1 ring-amber-200">
                        {formatTimelineEnumValue(selectedTimelineEvent.status)}
                      </span>
                      {showSelectedDetailedRange ? (
                        <span className="rounded-full bg-white px-3 py-1 ring-1 ring-amber-200">
                          {selectedDetailedRange}
                        </span>
                      ) : null}
                      {selectedSequenceLabel ? (
                        <span className="rounded-full bg-white px-3 py-1 ring-1 ring-amber-200">
                          {selectedSequenceLabel}
                        </span>
                      ) : null}
                    </div>
                    {(selectedStartDate || selectedEndDate || selectedTimelineEvent.timeOfDayLabel) ? (
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-600">
                        {selectedStartDate ? (
                          <span className="rounded-full bg-white px-3 py-1 ring-1 ring-amber-200">
                            Start: {selectedStartDate}
                          </span>
                        ) : null}
                        {selectedEndDate ? (
                          <span className="rounded-full bg-white px-3 py-1 ring-1 ring-amber-200">
                            End: {selectedEndDate}
                          </span>
                        ) : null}
                        {selectedTimelineEvent.timeOfDayLabel ? (
                          <span className="rounded-full bg-white px-3 py-1 ring-1 ring-amber-200">
                            Time: {selectedTimelineEvent.timeOfDayLabel}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/timeline-events/${selectedTimelineEvent.id}`}
                      className="inline-flex h-10 items-center justify-center rounded-full border border-amber-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-amber-100/50"
                    >
                      Open detail
                    </Link>
                    <button
                      type="button"
                      onClick={() =>
                        setComposerState({
                          mode: "edit",
                          timelineEventId: selectedTimelineEvent.id,
                        })
                      }
                      className="inline-flex h-10 items-center justify-center rounded-full bg-amber-400 px-4 text-sm font-medium text-amber-950 transition hover:bg-amber-300"
                    >
                      Edit here
                    </button>
                  </div>
                </div>

                {selectedIssues.length > 0 ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-amber-900">
                    <p className="font-medium">Validation warnings</p>
                    <div className="mt-2 space-y-1">
                      {selectedIssues.map((issue) => (
                        <p key={issue.message}>{issue.message}</p>
                      ))}
                    </div>
                  </div>
                ) : null}

                {selectedGroups.length > 0 ? (
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {selectedGroups.slice(0, 6).map((group) => (
                      <SelectedReferenceGroup key={group.label} group={group} />
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-zinc-600">
                    No linked manuscript, entity, or continuity records on this block yet.
                  </p>
                )}
              </div>
            ) : null}
          </div>

          <div className="relative">
            <div className="absolute bottom-10 left-6 top-10 w-px bg-linear-to-b from-amber-300 via-zinc-300 to-amber-300 md:left-1/2 md:-translate-x-1/2" />

            <div className="space-y-5 md:space-y-6">
              {layout.items.map((item) => {
                if (item.kind === "event") {
                  return (
                    <TimelineEventRow
                      key={item.id}
                      eventItem={item}
                      isSelected={item.timelineEvent.id === selectedEventId}
                      knownTimelineEventIds={knownTimelineEventIds}
                      referenceMaps={availableReferenceMaps}
                      referenceSets={availableReferenceSets}
                      onSelect={focusEvent}
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
                      setComposerState({
                        mode: "create",
                        insertionItem: nextInsertionItem,
                      })
                    }
                  />
                );
              })}
            </div>
          </div>
        </section>
      </section>

      {composerState ? (
        <TimelineEventComposerSheet
          activeProjectId={activeProjectId}
          insertionItem={composerState.mode === "create" ? composerState.insertionItem : null}
          mode={composerState.mode}
          onClose={() => setComposerState(null)}
          onSaved={handleSaved}
          timelineEvent={editingTimelineEvent}
          uid={uid}
        />
      ) : null}
    </>
  );
}

function TimelineEventRow({
  eventItem,
  isSelected,
  knownTimelineEventIds,
  referenceMaps,
  referenceSets,
  onSelect,
  registerRef,
}: {
  eventItem: TimelineLayoutEventItem;
  isSelected: boolean;
  knownTimelineEventIds: ReadonlySet<string>;
  referenceMaps: ReturnType<typeof useTimelineFormOptions>["referenceMaps"] | null;
  referenceSets: ReturnType<typeof useTimelineFormOptions>["referenceSets"] | null;
  onSelect: (eventId: string) => void;
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
          knownTimelineEventIds={knownTimelineEventIds}
          referenceMaps={referenceMaps}
          referenceSets={referenceSets}
          selected={isSelected}
          timelineEvent={eventItem.timelineEvent}
        />
      </div>

      <div className="absolute left-6 top-8 flex -translate-x-1/2 justify-center md:static md:col-start-2 md:row-start-1 md:translate-x-0">
        <button
          type="button"
          onClick={() => onSelect(eventItem.timelineEvent.id)}
          className={`flex h-12 w-12 items-center justify-center rounded-full border-4 text-sm font-semibold transition ${
            isSelected
              ? "border-amber-200 bg-amber-400 text-amber-950"
              : "border-white bg-zinc-950 text-white hover:bg-zinc-800"
          }`}
          aria-label={`Focus ${eventItem.timelineEvent.title}`}
        >
          {eventItem.timelineEvent.title.slice(0, 1).toUpperCase()}
        </button>
      </div>
    </div>
  );
}

function SelectedReferenceGroup({
  group,
}: {
  group?: TimelineLinkedReferenceGroup;
}) {
  if (!group || group.items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        {group.label}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {group.items.slice(0, 4).map((item) => (
          <Link
            key={`${group.label}-${item.id}`}
            href={item.href}
            className={`rounded-full px-3 py-1 text-sm transition ${
              item.missing
                ? "bg-amber-100 text-amber-900 ring-1 ring-amber-200"
                : "bg-zinc-50 text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-100"
            }`}
            title={item.meta ? `${item.label} - ${item.meta}` : item.label}
          >
            {item.label}
          </Link>
        ))}
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
        <div className="rounded-full border border-amber-200 bg-white/90 px-4 py-2 text-center shadow-sm backdrop-blur">
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
          className="flex h-11 w-11 items-center justify-center rounded-full border-4 border-white bg-amber-400 text-xl font-semibold text-amber-950 shadow-sm transition hover:bg-amber-300"
          aria-label={insertionItem.label}
        >
          +
        </button>
      </div>

      <div className="pl-16 md:col-span-3 md:pl-0 md:text-center">
        <Link
          href={buildTimelineInsertionHref(insertionItem)}
          className="text-xs font-medium text-zinc-500 underline decoration-zinc-300 underline-offset-4 transition hover:text-zinc-700"
        >
          Open full-page create instead
        </Link>
      </div>
    </div>
  );
}
