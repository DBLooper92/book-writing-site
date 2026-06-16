import { describe, expect, it } from "vitest";

import { buildTimelineLayoutModel } from "./layout";
import type { TimelineEvent } from "../../types/timeline-event";

function createTimelineEvent(
  id: string,
  title: string,
  date: {
    dayStart?: number | null;
    monthStart?: number | null;
    yearStart: number;
  }
): TimelineEvent {
  const now = new Date("2026-06-12T12:00:00.000Z");

  return {
    id,
    projectId: "project-1",
    title,
    slug: id,
    summary: "",
    description: "",
    status: "active",
    tags: [],
    isArchived: false,
    canonLevel: "working",
    confidence: "medium",
    eventType: "other",
    yearStart: date.yearStart,
    monthStart: date.monthStart ?? null,
    dayStart: date.dayStart ?? null,
    yearEnd: date.yearStart,
    monthEnd: date.monthStart ?? null,
    dayEnd: date.dayStart ?? null,
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
    predecessorEventIds: [],
    successorEventIds: [],
    publicWikiSummary: "",
    creationSource: "manual",
    sourceBrainDumpText: "",
    sourceInsertionItemId: null,
    sourceJobId: null,
    createdAt: now,
    updatedAt: now,
  };
}

describe("buildTimelineLayoutModel", () => {
  it("prefills the shared exact date when inserting between two matching points", () => {
    const layout = buildTimelineLayoutModel([
      createTimelineEvent("event-a", "Event A", {
        dayStart: 5,
        monthStart: 3,
        yearStart: 2026,
      }),
      createTimelineEvent("event-b", "Event B", {
        dayStart: 5,
        monthStart: 3,
        yearStart: 2026,
      }),
    ]);

    const insertionItem = layout.items.find(
      (item) =>
        item.kind === "notch" &&
        item.previousEventId === "event-a" &&
        item.nextEventId === "event-b"
    );

    expect(insertionItem).toMatchObject({
      nextBoundaryDay: 5,
      nextBoundaryMonth: 3,
      nextBoundaryYear: 2026,
      previousBoundaryDay: 5,
      previousBoundaryMonth: 3,
      previousBoundaryYear: 2026,
      prefilledDayEnd: "",
      prefilledDayStart: "",
      prefilledMonthEnd: "",
      prefilledMonthStart: "",
      prefilledYearEnd: "",
      prefilledYearStart: "",
    });
  });

  it("keeps the shared year and month when the day differs between neighbors", () => {
    const layout = buildTimelineLayoutModel([
      createTimelineEvent("event-a", "Event A", {
        dayStart: 5,
        monthStart: 3,
        yearStart: 2026,
      }),
      createTimelineEvent("event-b", "Event B", {
        dayStart: 10,
        monthStart: 3,
        yearStart: 2026,
      }),
    ]);

    const insertionItem = layout.items.find(
      (item) =>
        item.kind === "notch" &&
        item.previousEventId === "event-a" &&
        item.nextEventId === "event-b"
    );

    expect(insertionItem).toMatchObject({
      nextBoundaryDay: 10,
      nextBoundaryMonth: 3,
      nextBoundaryYear: 2026,
      previousBoundaryDay: 5,
      previousBoundaryMonth: 3,
      previousBoundaryYear: 2026,
      prefilledDayEnd: "",
      prefilledDayStart: "",
      prefilledMonthEnd: "",
      prefilledMonthStart: "",
      prefilledYearEnd: "",
      prefilledYearStart: "",
    });
  });
});
