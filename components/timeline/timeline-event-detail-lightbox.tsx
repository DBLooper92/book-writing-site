"use client";

import { useState } from "react";

import { TimelineLinkedRecordLightbox } from "@/components/timeline/timeline-linked-record-lightbox";
import { TimelineEventDetailView } from "@/components/timeline-events/timeline-event-detail-view";
import {
  type TimelineLinkedReferenceItem,
  type TimelineReferenceMaps,
  type TimelineReferenceSets,
} from "@/lib/timeline/references";
import { getTimelineEventChronologyLabel } from "@/lib/timeline/workspace";
import type { TimelineEvent } from "@/types/timeline-event";

type TimelineEventDetailLightboxProps = {
  knownTimelineEventIds: ReadonlySet<string>;
  onClose: () => void;
  onDelete?: ((timelineEvent: TimelineEvent) => Promise<void>) | null;
  onEdit: () => void;
  referenceMaps: TimelineReferenceMaps;
  referenceSets: TimelineReferenceSets;
  timelineEvent: TimelineEvent;
};

export function TimelineEventDetailLightbox({
  knownTimelineEventIds,
  onClose,
  onDelete,
  onEdit,
  referenceMaps,
  referenceSets,
  timelineEvent,
}: TimelineEventDetailLightboxProps) {
  const [selectedLinkedRecord, setSelectedLinkedRecord] =
    useState<TimelineLinkedReferenceItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (deleting || !onDelete) {
      return;
    }

    const shouldDelete = window.confirm(
      `Delete "${timelineEvent.title}"? This cannot be undone.`
    );

    if (!shouldDelete) {
      return;
    }

    setDeleting(true);

    try {
      await onDelete(timelineEvent);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 px-4 py-6 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

        <div className="relative z-10 flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-4xl border border-zinc-200 bg-[#fffdf9] shadow-2xl">
          <div className="border-b border-zinc-200 bg-white px-6 py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Timeline event
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
                  {timelineEvent.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  {getTimelineEventChronologyLabel(timelineEvent)}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onEdit}
                  disabled={deleting}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
                >
                  Edit event
                </button>
                {onDelete ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {deleting ? "Deleting..." : "Delete event"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onClose}
                  disabled={deleting}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-6">
              <TimelineEventDetailView
                knownTimelineEventIds={knownTimelineEventIds}
                onOpenLinkedRecord={setSelectedLinkedRecord}
                referenceMaps={referenceMaps}
                referenceSets={referenceSets}
                timelineEvent={timelineEvent}
              />
            </div>
          </div>
        </div>
      </div>

      {selectedLinkedRecord ? (
        <TimelineLinkedRecordLightbox
          item={selectedLinkedRecord}
          onClose={() => setSelectedLinkedRecord(null)}
          referenceMaps={referenceMaps}
          referenceSets={referenceSets}
        />
      ) : null}
    </>
  );
}
