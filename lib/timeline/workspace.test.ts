import { describe, expect, it } from "vitest";

import { sortTimelineEvents } from "./workspace";
import type { TimelineEvent } from "../../types/timeline-event";

function createTimelineEvent(
  id: string,
  createdAt: string,
  options: {
    dayEnd?: number | null;
    dayStart?: number | null;
    predecessorEventIds?: string[];
    monthEnd?: number | null;
    monthStart?: number | null;
    successorEventIds?: string[];
    title?: string;
    yearEnd?: number | null;
    yearStart?: number | null;
  } = {},
): TimelineEvent {
  const now = new Date(createdAt);

  return {
    id,
    projectId: "project-1",
    title: options.title ?? id,
    slug: id,
    summary: "",
    description: "",
    status: "active",
    tags: [],
    isArchived: false,
    canonLevel: "working",
    confidence: "medium",
    eventType: "other",
    yearStart: options.yearStart ?? null,
    monthStart: options.monthStart ?? null,
    dayStart: options.dayStart ?? null,
    yearEnd: options.yearEnd ?? null,
    monthEnd: options.monthEnd ?? null,
    dayEnd: options.dayEnd ?? null,
    chronologyOrder: null,
    timeOfDayLabel: "",
    displayDateLabel: "",
    eraId: null,
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
    causes: [],
    consequences: [],
    predecessorEventIds: options.predecessorEventIds ?? [],
    successorEventIds: options.successorEventIds ?? [],
    publicWikiSummary: "",
    creationSource: "manual",
    sourceBrainDumpText: "",
    sourceInsertionItemId: null,
    sourceJobId: null,
    createdAt: now,
    updatedAt: now,
  };
}

describe("sortTimelineEvents", () => {
  it("uses createdAt before title when dated events are otherwise tied", () => {
    const events = [
      createTimelineEvent("event-zeta", "2026-06-12T10:00:00.000Z", {
        dayStart: 5,
        monthStart: 3,
        title: "Zeta",
        yearStart: 2026,
      }),
      createTimelineEvent("event-alpha", "2026-06-12T11:00:00.000Z", {
        dayStart: 5,
        monthStart: 3,
        title: "Alpha",
        yearStart: 2026,
      }),
    ];

    expect(sortTimelineEvents(events).map((event) => event.id)).toEqual([
      "event-zeta",
      "event-alpha",
    ]);
  });

  it("prefers insertion-origin undated events over unrelated undated events", () => {
    const events = [
      createTimelineEvent("event-insertion", "2026-06-12T12:00:00.000Z"),
      createTimelineEvent("event-unrelated", "2026-06-12T10:00:00.000Z"),
    ];

    events[0].sourceInsertionItemId = "notch-event-a-event-b";

    expect(sortTimelineEvents(events).map((event) => event.id)).toEqual([
      "event-insertion",
      "event-unrelated",
    ]);
  });

  it("keeps a linked insertion chain contiguous instead of splitting it around unrelated events", () => {
    const events = [
      createTimelineEvent("event-a", "2026-06-12T10:00:00.000Z", {
        successorEventIds: ["event-b"],
      }),
      createTimelineEvent("event-c", "2026-06-12T11:00:00.000Z"),
      createTimelineEvent("event-b", "2026-06-12T12:00:00.000Z", {
        predecessorEventIds: ["event-a"],
        successorEventIds: ["event-d"],
      }),
      createTimelineEvent("event-d", "2026-06-12T13:00:00.000Z"),
    ];

    events[2].sourceInsertionItemId = "notch-event-a-event-d";

    expect(sortTimelineEvents(events).map((event) => event.id)).toEqual([
      "event-a",
      "event-b",
      "event-c",
      "event-d",
    ]);
  });

  it("keeps a multi-event insertion chain in the intended gap order", () => {
    const events = [
      createTimelineEvent("event-a", "2026-06-12T10:00:00.000Z", {
        successorEventIds: ["event-b"],
      }),
      createTimelineEvent("event-d", "2026-06-12T11:00:00.000Z", {
        predecessorEventIds: ["event-c"],
      }),
      createTimelineEvent("event-c", "2026-06-12T12:00:00.000Z", {
        predecessorEventIds: ["event-b"],
        successorEventIds: ["event-d"],
      }),
      createTimelineEvent("event-b", "2026-06-12T13:00:00.000Z", {
        predecessorEventIds: ["event-a"],
        successorEventIds: ["event-c"],
      }),
    ];

    for (const event of events.slice(1)) {
      event.sourceInsertionItemId = "notch-event-a-event-d";
    }

    expect(sortTimelineEvents(events).map((event) => event.id)).toEqual([
      "event-a",
      "event-b",
      "event-c",
      "event-d",
    ]);
  });
});
