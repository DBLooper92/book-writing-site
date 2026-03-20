"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { TimelineEventComposerSheet } from "@/components/timeline/timeline-event-composer-sheet";
import { TimelineEventDetailLightbox } from "@/components/timeline/timeline-event-detail-lightbox";
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
import { formatTimelineEnumValue } from "@/lib/timeline/workspace";
import type { TimelineEvent, TimelineEventFormValues } from "@/types/timeline-event";

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
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [requestedSelectedEventId, setRequestedSelectedEventId] = useState<string | null>(null);
  const [viewerEventId, setViewerEventId] = useState<string | null>(null);
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
  const selectedTimelineEvent =
    timelineEvents.find((timelineEvent) => timelineEvent.id === selectedEventId) ?? null;
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

  function handleSaved(timelineEventId: string) {
    setRequestedSelectedEventId(timelineEventId);
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
            Jump by block number while the main timeline stays spaced and readable.
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
                    Block {quickNavItem.position}
                  </p>
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    {quickNavItem.chronologyLabel}
                  </p>
                  <p className="mt-1 text-sm font-semibold tracking-tight">{quickNavItem.title}</p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                    {isSelected ? "Selected block" : "Focus block"}
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
                <Link
                  href={buildTimelineCreateHref()}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
                >
                  Create timeline event
                </Link>
                {selectedTimelineEvent ? (
                  <button
                    type="button"
                    onClick={() => openViewer(selectedTimelineEvent.id)}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                  >
                    View selected event
                  </button>
                ) : null}
              </div>
            </div>

            {selectedTimelineEvent ? (
              <div className="rounded-3xl border border-amber-200 bg-amber-50/70 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-900">
                  Selected block
                </p>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-base font-semibold tracking-tight text-zinc-950">
                      {selectedTimelineEvent.title}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
                      {formatTimelineEnumValue(selectedTimelineEvent.status)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openViewer(selectedTimelineEvent.id)}
                    className="inline-flex h-10 items-center justify-center rounded-full bg-white px-4 text-sm font-medium text-zinc-700 ring-1 ring-amber-200 transition hover:bg-amber-100/50"
                  >
                    View Event
                  </button>
                </div>
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
              ? "border-amber-200 bg-amber-400 text-amber-950"
              : "border-white bg-zinc-950 text-white hover:bg-zinc-800"
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
