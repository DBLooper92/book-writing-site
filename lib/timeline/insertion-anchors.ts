import type { TimelineBrainDumpInsertionContext } from "@/types/ai-brain-dump";
import type { TimelineLayoutInsertionItem } from "@/lib/timeline/layout";
import type { NormalizedTimelineEventFormValues } from "@/types/timeline-event";

export function applyInsertionAnchorsToTimelineEventValues(
  values: NormalizedTimelineEventFormValues,
  insertionItem: TimelineLayoutInsertionItem | null
): NormalizedTimelineEventFormValues {
  if (!insertionItem) {
    return values;
  }

  return {
    ...values,
    predecessorEventIds: insertionItem.previousEventId ? [insertionItem.previousEventId] : [],
    successorEventIds: insertionItem.nextEventId ? [insertionItem.nextEventId] : [],
  };
}

export function validateInsertionTimelineEventChronology(
  values: NormalizedTimelineEventFormValues,
  insertionItem: TimelineLayoutInsertionItem | null
) {
  if (!insertionItem) {
    return null;
  }

  const eventRange = buildEventRange(values);

  if (!eventRange) {
    return null;
  }

  const previousBoundary = buildBoundaryParts(
    insertionItem.previousBoundaryYear,
    insertionItem.previousBoundaryMonth,
    insertionItem.previousBoundaryDay
  );
  const nextBoundary = buildBoundaryParts(
    insertionItem.nextBoundaryYear,
    insertionItem.nextBoundaryMonth,
    insertionItem.nextBoundaryDay
  );

  if (previousBoundary && eventRange.start && compareChronologyParts(eventRange.start, previousBoundary) < 0) {
    return "This date begins before the selected insertion point.";
  }

  if (nextBoundary && eventRange.end && compareChronologyParts(eventRange.end, nextBoundary) > 0) {
    return "This date extends past the selected insertion point.";
  }

  return null;
}

export function getInsertionBoundaryEventIds(
  insertionContext: TimelineBrainDumpInsertionContext | null | undefined
) {
  const surroundingEvents = insertionContext?.surroundingEvents ?? [];
  const beforeEvents = surroundingEvents.filter((event) => event.relation === "before");
  const afterEvents = surroundingEvents.filter((event) => event.relation === "after");

  return {
    previousEventId: beforeEvents.at(-1)?.id ?? null,
    nextEventId: afterEvents[0]?.id ?? null,
  };
}

function buildEventRange(values: NormalizedTimelineEventFormValues) {
  const start = buildBoundaryParts(values.yearStart, values.monthStart, values.dayStart);
  const end = buildBoundaryParts(values.yearEnd, values.monthEnd, values.dayEnd);

  if (!start && !end) {
    return null;
  }

  return {
    end: end ?? start,
    start: start ?? end,
  };
}

function buildBoundaryParts(year: number | null, month: number | null, day: number | null) {
  if (year === null && month === null && day === null) {
    return null;
  }

  return {
    day: parseBoundaryPart(day),
    month: parseBoundaryPart(month),
    year: parseBoundaryPart(year),
  };
}

function compareChronologyParts(
  left: { year: number | null; month: number | null; day: number | null },
  right: { year: number | null; month: number | null; day: number | null }
) {
  const parts: Array<keyof typeof left> = ["year", "month", "day"];

  for (const part of parts) {
    const leftValue = left[part];
    const rightValue = right[part];

    if (leftValue === null || rightValue === null) {
      continue;
    }

    if (leftValue !== rightValue) {
      return leftValue - rightValue;
    }
  }

  return 0;
}

function parseBoundaryPart(value: number | null | string) {
  if (typeof value === "number") {
    return value;
  }

  const normalized = String(value ?? "").trim();

  if (!normalized) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
}
