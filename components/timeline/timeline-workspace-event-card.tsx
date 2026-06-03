"use client";

import { useEffect, useState, type FormEvent } from "react";

import { AiSummaryGenerator } from "@/components/ai/ai-summary-generator";
import {
  formatTimelineEventBoundaryLabel,
} from "@/lib/timeline/workspace";
import type { TimelineEvent } from "@/types/timeline-event";

type TimelineWorkspaceEventCardProps = {
  chapterLabelsById?: ReadonlyMap<string, string>;
  bookLabelsById?: ReadonlyMap<string, string>;
  onSaveSummaryDescription?: (
    timelineEventId: string,
    payload: { summary: string; description: string }
  ) => Promise<void>;
  onView: (timelineEventId: string) => void;
  position: number;
  selected?: boolean;
  timelineEvent: TimelineEvent;
};

export function TimelineWorkspaceEventCard({
  chapterLabelsById = EMPTY_LABEL_MAP,
  bookLabelsById = EMPTY_LABEL_MAP,
  onSaveSummaryDescription,
  onView,
  position,
  selected = false,
  timelineEvent,
}: TimelineWorkspaceEventCardProps) {
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [descriptionLightboxOpen, setDescriptionLightboxOpen] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [draftSummary, setDraftSummary] = useState(timelineEvent.summary);
  const [draftDescription, setDraftDescription] = useState(timelineEvent.description);
  const [savingSummaryDescription, setSavingSummaryDescription] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const linkedBooksLabel = formatLinkedRecordSummary(
    timelineEvent.bookIds,
    bookLabelsById,
    "Book",
    "Books"
  );
  const linkedChaptersLabel = formatLinkedRecordSummary(
    timelineEvent.chapterIds,
    chapterLabelsById,
    "Chapter",
    "Chapters"
  );
  const normalizedSummary = timelineEvent.summary.trim();
  const canExpandSummary = canExpandSummaryPreview(normalizedSummary);
  const hasMetadataSection =
    Boolean(linkedBooksLabel) || Boolean(linkedChaptersLabel) || normalizedSummary.length > 0;

  useEffect(() => {
    setDraftSummary(timelineEvent.summary);
    setDraftDescription(timelineEvent.description);
    setSaveError(null);
    setEditingDescription(false);
  }, [timelineEvent.description, timelineEvent.id, timelineEvent.summary]);

  useEffect(() => {
    if (!descriptionLightboxOpen) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDescriptionLightboxOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [descriptionLightboxOpen]);

  async function handleSaveSummaryDescription(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSavingSummaryDescription(true);
    setSaveError(null);

    try {
      if (!onSaveSummaryDescription) {
        throw new Error("Inline summary editing is unavailable in this build.");
      }

      await onSaveSummaryDescription(timelineEvent.id, {
        summary: draftSummary,
        description: draftDescription,
      });
      setEditingDescription(false);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Unable to update the summary and description right now."
      );
    } finally {
      setSavingSummaryDescription(false);
    }
  }

  return (
    <article
      className={`rounded-3xl border p-5 shadow-[0_20px_45px_-38px_rgba(24,24,27,0.4)] transition ${
        selected
          ? "border-zinc-950 bg-zinc-50"
          : "border-zinc-200 bg-white hover:border-zinc-300"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Block {position}
          </p>
          <h3 className="mt-2 text-lg font-semibold tracking-tight text-zinc-950">
            {timelineEvent.title}
          </h3>
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
          {timelineEvent.displayDateLabel.trim() || "Undated"}
        </span>
      </div>

      {hasMetadataSection ? (
        <div className="mt-4 space-y-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-xs leading-5 text-zinc-700">
          {linkedBooksLabel ? <p>{linkedBooksLabel}</p> : null}
          {linkedChaptersLabel ? <p>{linkedChaptersLabel}</p> : null}

          {normalizedSummary ? (
            <div className={`${linkedBooksLabel || linkedChaptersLabel ? "border-t border-zinc-200 pt-2" : ""}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Summary
              </p>
              <p
                className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-700"
                style={
                  summaryExpanded
                    ? undefined
                    : {
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }
                }
              >
                {normalizedSummary || "No summary yet."}
              </p>
              {canExpandSummary ? (
                <button
                  type="button"
                  onClick={() => setSummaryExpanded((current) => !current)}
                  className="mt-1 text-xs font-medium text-zinc-700 underline underline-offset-2 transition hover:text-zinc-900"
                >
                  {summaryExpanded ? "Show less" : "...see more"}
                </button>
              ) : null}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setDescriptionLightboxOpen(true)}
            className="inline-flex text-xs font-semibold uppercase tracking-[0.14em] text-zinc-700 underline underline-offset-2 transition hover:text-zinc-900"
          >
            View Description
          </button>
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-200 pt-4">
        <p className="min-w-0 truncate text-sm text-zinc-600">
          {formatTimelineEventDateRangeLabel(timelineEvent)}
        </p>
        <button
          type="button"
          onClick={() => onView(timelineEvent.id)}
          className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          View Event
        </button>
      </div>

      {descriptionLightboxOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/45 px-4 py-6 backdrop-blur-sm">
          <div
            className="absolute inset-0"
            onClick={() => setDescriptionLightboxOpen(false)}
            aria-hidden="true"
          />

          <div className="relative z-10 mx-auto my-auto w-full max-w-2xl max-h-[calc(100vh-3rem)] overflow-y-auto rounded-4xl border border-zinc-200 bg-[#fffdf9] p-6 shadow-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Timeline event
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
              {timelineEvent.title}
            </h3>

            {editingDescription ? (
              <form onSubmit={handleSaveSummaryDescription} className="mt-5 space-y-4">
                <label className="block text-sm font-medium text-zinc-800">
                  Summary
                  <textarea
                    value={draftSummary}
                    onChange={(event) => setDraftSummary(event.target.value)}
                    className="mt-2 min-h-28 w-full rounded-2xl border border-zinc-300 bg-white px-3 py-2 text-sm leading-6 text-zinc-900 outline-hidden transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/15"
                    placeholder="Add a short summary for this timeline event."
                  />
                </label>

                <AiSummaryGenerator
                  description={draftDescription}
                  entityType="Timeline event"
                  summary={draftSummary}
                  title={timelineEvent.title}
                  onApply={(nextSummary) => setDraftSummary(nextSummary)}
                />

                <label className="block text-sm font-medium text-zinc-800">
                  Description
                  <textarea
                    value={draftDescription}
                    onChange={(event) => setDraftDescription(event.target.value)}
                    className="mt-2 min-h-44 w-full rounded-2xl border border-zinc-300 bg-white px-3 py-2 text-sm leading-6 text-zinc-900 outline-hidden transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/15"
                    placeholder="Add full event description details."
                  />
                </label>

                {saveError ? (
                  <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {saveError}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={savingSummaryDescription}
                    className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {savingSummaryDescription ? "Saving..." : "Save changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDescription(false);
                      setDraftSummary(timelineEvent.summary);
                      setDraftDescription(timelineEvent.description);
                      setSaveError(null);
                    }}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Full summary
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                    {timelineEvent.summary || "No summary yet."}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Full description
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                    {timelineEvent.description || "No description yet."}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingDescription(true)}
                    className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDescriptionLightboxOpen(false)}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </article>
  );
}

const EMPTY_LABEL_MAP: ReadonlyMap<string, string> = new Map();

function formatTimelineEventDateRangeLabel(timelineEvent: TimelineEvent) {
  const startLabel = formatTimelineEventBoundaryLabel(timelineEvent, "start");
  const endLabel = formatTimelineEventBoundaryLabel(timelineEvent, "end");
  const timeLabel = timelineEvent.timeOfDayLabel.trim();
  let rangeLabel = "Undated";

  if (startLabel && endLabel) {
    rangeLabel = `${startLabel} - ${endLabel}`;
  } else if (startLabel) {
    rangeLabel = `${startLabel} - No end date`;
  } else if (endLabel) {
    rangeLabel = `No start date - ${endLabel}`;
  }

  return timeLabel ? `${rangeLabel} · ${timeLabel}` : rangeLabel;
}

function formatLinkedRecordSummary(
  linkedIds: string[],
  labelsById: ReadonlyMap<string, string>,
  singularLabel: string,
  pluralLabel: string
) {
  if (linkedIds.length === 0) {
    return "";
  }

  const resolvedLabels = linkedIds.map((linkedId) => labelsById.get(linkedId) ?? linkedId);
  const previewLabels = resolvedLabels.slice(0, 2).join(", ");
  const remainingCount = resolvedLabels.length - 2;
  const prefix = resolvedLabels.length === 1 ? singularLabel : pluralLabel;

  return remainingCount > 0
    ? `${prefix}: ${previewLabels} +${remainingCount}`
    : `${prefix}: ${previewLabels}`;
}

function canExpandSummaryPreview(summary: string) {
  if (!summary.trim()) {
    return false;
  }

  const lines = summary.split(/\r?\n/).filter((line) => line.trim().length > 0);
  return lines.length > 2 || summary.trim().length > 220;
}
