import {
  compareTimelineEvents,
  formatDetailedTimelineEventRange,
  getTimelineEventAnchorYear,
} from "@/lib/timeline/workspace";
import type { TimelineEvent } from "@/types/timeline-event";

export type TimelineLayoutEventItem = {
  kind: "event";
  id: string;
  side: "left" | "right";
  timelineEvent: TimelineEvent;
};

export type TimelineLayoutGapItem = {
  kind: "gap";
  id: string;
  fromEventId: string;
  toEventId: string;
  gapYears: number;
  label: string;
  heightPx: number;
};

export type TimelineLayoutInsertionItem = {
  kind: "notch";
  id: string;
  label: string;
  helperText: string;
  previousEventId: string | null;
  nextEventId: string | null;
  previousEventTitle: string | null;
  nextEventTitle: string | null;
  prefilledYearStart: string;
  prefilledYearEnd: string;
};

export type TimelineLayoutItem =
  | TimelineLayoutEventItem
  | TimelineLayoutGapItem
  | TimelineLayoutInsertionItem;

export type TimelineQuickNavItem = {
  eventId: string;
  title: string;
  summary: string;
  chronologyLabel: string;
  status: string;
};

export type TimelineLayoutModel = {
  items: TimelineLayoutItem[];
  quickNavItems: TimelineQuickNavItem[];
};

const GAP_MARKER_THRESHOLD_YEARS = 5;
const MIN_GAP_HEIGHT_PX = 88;
const MAX_GAP_HEIGHT_PX = 188;

export function buildTimelineLayoutModel(timelineEvents: TimelineEvent[]): TimelineLayoutModel {
  const sortedTimelineEvents = [...timelineEvents].sort(compareTimelineEvents);
  const items: TimelineLayoutItem[] = [];

  items.push(buildInsertionItem(null, sortedTimelineEvents[0] ?? null));

  sortedTimelineEvents.forEach((timelineEvent, index) => {
    items.push({
      kind: "event",
      id: timelineEvent.id,
      side: index % 2 === 0 ? "left" : "right",
      timelineEvent,
    });

    const nextTimelineEvent = sortedTimelineEvents[index + 1] ?? null;

    if (nextTimelineEvent) {
      const gapItem = buildGapItem(timelineEvent, nextTimelineEvent);

      if (gapItem) {
        items.push(gapItem);
      }
    }

    items.push(buildInsertionItem(timelineEvent, nextTimelineEvent));
  });

  return {
    items,
    quickNavItems: sortedTimelineEvents.map((timelineEvent) => ({
      eventId: timelineEvent.id,
      title: timelineEvent.title,
      summary: timelineEvent.summary,
      chronologyLabel: getChronologyLabel(timelineEvent),
      status: timelineEvent.status,
    })),
  };
}

function buildInsertionItem(
  previousTimelineEvent: TimelineEvent | null,
  nextTimelineEvent: TimelineEvent | null
): TimelineLayoutInsertionItem {
  const previousAnchorYear = previousTimelineEvent
    ? getTimelineEventAnchorYear(previousTimelineEvent)
    : null;
  const nextAnchorYear = nextTimelineEvent ? getTimelineEventAnchorYear(nextTimelineEvent) : null;
  const sharedAnchorYear =
    typeof previousAnchorYear === "number" &&
    typeof nextAnchorYear === "number" &&
    previousAnchorYear === nextAnchorYear
      ? String(previousAnchorYear)
      : "";

  return {
    kind: "notch",
    id: [
      "notch",
      previousTimelineEvent?.id ?? "start",
      nextTimelineEvent?.id ?? "end",
    ].join("-"),
    label: buildInsertionLabel(previousTimelineEvent, nextTimelineEvent),
    helperText: buildInsertionHelperText(
      previousTimelineEvent,
      nextTimelineEvent,
      sharedAnchorYear
    ),
    previousEventId: previousTimelineEvent?.id ?? null,
    nextEventId: nextTimelineEvent?.id ?? null,
    previousEventTitle: previousTimelineEvent?.title ?? null,
    nextEventTitle: nextTimelineEvent?.title ?? null,
    prefilledYearStart: sharedAnchorYear,
    prefilledYearEnd: sharedAnchorYear,
  };
}

function buildGapItem(leftTimelineEvent: TimelineEvent, rightTimelineEvent: TimelineEvent) {
  const leftAnchorYear = getTimelineEventAnchorYear(leftTimelineEvent);
  const rightAnchorYear = getTimelineEventAnchorYear(rightTimelineEvent);

  if (typeof leftAnchorYear !== "number" || typeof rightAnchorYear !== "number") {
    return null;
  }

  const gapYears = rightAnchorYear - leftAnchorYear;

  if (gapYears < GAP_MARKER_THRESHOLD_YEARS) {
    return null;
  }

  return {
    kind: "gap",
    id: `gap-${leftTimelineEvent.id}-${rightTimelineEvent.id}`,
    fromEventId: leftTimelineEvent.id,
    toEventId: rightTimelineEvent.id,
    gapYears,
    label: formatGapLabel(gapYears),
    heightPx: clampGapHeight(gapYears),
  } satisfies TimelineLayoutGapItem;
}

function buildInsertionLabel(
  previousTimelineEvent: TimelineEvent | null,
  nextTimelineEvent: TimelineEvent | null
) {
  if (previousTimelineEvent && nextTimelineEvent) {
    return "Insert between events";
  }

  if (nextTimelineEvent) {
    return "Insert before the first dated block";
  }

  if (previousTimelineEvent) {
    return "Extend the chronology";
  }

  return "Create the first timeline block";
}

function buildInsertionHelperText(
  previousTimelineEvent: TimelineEvent | null,
  nextTimelineEvent: TimelineEvent | null,
  sharedAnchorYear: string
) {
  if (previousTimelineEvent && nextTimelineEvent) {
    const dateHint = sharedAnchorYear
      ? ` Prefills year ${sharedAnchorYear}.`
      : "";
    return `Between ${previousTimelineEvent.title} and ${nextTimelineEvent.title}.${dateHint}`;
  }

  if (nextTimelineEvent) {
    return `Adds a new event before ${nextTimelineEvent.title}.`;
  }

  if (previousTimelineEvent) {
    return `Adds a new event after ${previousTimelineEvent.title}.`;
  }

  return "Start the chronology with a new timeline event.";
}

function getChronologyLabel(timelineEvent: TimelineEvent) {
  if (timelineEvent.displayDateLabel.trim()) {
    return timelineEvent.displayDateLabel.trim();
  }

  return formatDetailedTimelineEventRange(timelineEvent);
}

function formatGapLabel(gapYears: number) {
  if (gapYears >= 1000) {
    return `${formatCompactNumber(gapYears)} years later`;
  }

  return `${gapYears} years later`;
}

function clampGapHeight(gapYears: number) {
  const scaledHeight = MIN_GAP_HEIGHT_PX + Math.log10(gapYears) * 56;
  return Math.max(MIN_GAP_HEIGHT_PX, Math.min(MAX_GAP_HEIGHT_PX, Math.round(scaledHeight)));
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
