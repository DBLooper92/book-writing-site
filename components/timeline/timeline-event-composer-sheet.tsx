"use client";

import { TimelineEventForm } from "@/components/timeline-events/timeline-event-form";
import {
  createTimelineEventForProject,
  updateTimelineEventForProject,
} from "@/lib/data/timeline-events";
import type { TimelineLayoutInsertionItem } from "@/lib/timeline/layout";
import { createEmptyTimelineEventFormValues, timelineEventToFormValues, type NormalizedTimelineEventFormValues, type TimelineEvent, type TimelineEventFormValues } from "@/types/timeline-event";

type TimelineEventComposerSheetProps = {
  activeProjectId: string;
  insertionItem?: TimelineLayoutInsertionItem | null;
  initialValuesOverride?: TimelineEventFormValues | null;
  mode: "create" | "edit";
  onClose: () => void;
  onSaved: (timelineEventId: string) => void;
  timelineEvent?: TimelineEvent | null;
  uid: string;
};

export function TimelineEventComposerSheet({
  activeProjectId,
  insertionItem,
  initialValuesOverride,
  mode,
  onClose,
  onSaved,
  timelineEvent,
  uid,
}: TimelineEventComposerSheetProps) {
  const isEditMode = mode === "edit" && !!timelineEvent;
  const sheetTitle = isEditMode ? `Edit ${timelineEvent.title}` : "Create timeline block";
  const description = isEditMode
    ? "Update the selected timeline block without leaving the workspace."
    : insertionItem
      ? insertionItem.helperText
      : "Create a new timeline block directly from the visual chronology.";
  const initialValues =
    isEditMode && timelineEvent
      ? timelineEventToFormValues(timelineEvent)
      : initialValuesOverride ?? buildInsertionInitialValues(insertionItem ?? null);
  const formKey = isEditMode
    ? `edit-${timelineEvent?.id ?? "unknown"}`
    : `create-${insertionItem?.id ?? "blank"}-${initialValuesOverride ? "prefilled" : "default"}`;

  async function handleSubmit(values: NormalizedTimelineEventFormValues) {
    if (isEditMode && timelineEvent) {
      await updateTimelineEventForProject(uid, activeProjectId, timelineEvent.id, values);
      onSaved(timelineEvent.id);
      return;
    }

    const resolvedValues = resolveTimelineCreateValues(values, insertionItem ?? null);

    if (!resolvedValues) {
      return;
    }

    const newTimelineEventId = await createTimelineEventForProject(
      uid,
      activeProjectId,
      resolvedValues
    );
    onSaved(newTimelineEventId);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-zinc-950/35 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-zinc-200 bg-[#fffdf9] shadow-2xl">
        <div className="border-b border-zinc-200 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Timeline composer
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
                {sheetTitle}
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-600">{description}</p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 text-lg text-zinc-700 transition hover:bg-zinc-50"
              aria-label="Close timeline composer"
            >
              x
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <TimelineEventForm
            key={formKey}
            currentTimelineEventId={timelineEvent?.id ?? null}
            initialValues={initialValues}
            inlineCreationContext={{ activeProjectId, uid }}
            onCancel={onClose}
            submitLabel={isEditMode ? "Save changes" : "Create timeline event"}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
}

function buildInsertionInitialValues(insertionItem: TimelineLayoutInsertionItem | null) {
  const initialValues = createEmptyTimelineEventFormValues();

  if (!insertionItem) {
    return initialValues;
  }

  initialValues.yearStart = insertionItem.prefilledYearStart;
  initialValues.yearEnd = insertionItem.prefilledYearEnd;
  initialValues.predecessorEventIds = insertionItem.previousEventId
    ? [insertionItem.previousEventId]
    : [];
  initialValues.successorEventIds = insertionItem.nextEventId ? [insertionItem.nextEventId] : [];

  return initialValues;
}

function resolveTimelineCreateValues(
  values: NormalizedTimelineEventFormValues,
  insertionItem: TimelineLayoutInsertionItem | null
) {
  if (typeof values.yearStart === "number" || typeof values.yearEnd === "number") {
    return values;
  }

  const fallbackYear = parseInsertionFallbackYear(insertionItem?.fallbackYear ?? "");
  const shouldContinue = window.confirm(buildMissingYearConfirmationMessage(fallbackYear));

  if (!shouldContinue) {
    return null;
  }

  if (fallbackYear === null) {
    return values;
  }

  return {
    ...values,
    yearStart: fallbackYear,
    yearEnd: fallbackYear,
  };
}

function parseInsertionFallbackYear(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildMissingYearConfirmationMessage(fallbackYear: number | null) {
  if (typeof fallbackYear === "number") {
    return [
      "Save without a year?",
      "",
      `If you continue, this block will inherit ${fallbackYear} from the most recent earlier dated block so it stays anchored to this insertion point.`,
    ].join("\n");
  }

  return [
    "Save without a year?",
    "",
    "There is no earlier dated block before this insertion point, so this event will stay undated if you continue.",
  ].join("\n");
}
