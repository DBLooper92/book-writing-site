import { describe, expect, it } from "vitest";

import {
  applyInsertionAnchorsToTimelineEventValues,
  getInsertionBoundaryEventIds,
  validateInsertionTimelineEventChronology,
} from "./insertion-anchors";
import type { NormalizedTimelineEventFormValues } from "@/types/timeline-event";

function createValues(): NormalizedTimelineEventFormValues {
  return {
    title: "Test",
    summary: "",
    description: "",
    status: "active",
    eventType: "other",
    yearStart: null,
    monthStart: null,
    dayStart: null,
    yearEnd: null,
    monthEnd: null,
    dayEnd: null,
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
    predecessorEventIds: ["existing-predecessor"],
    successorEventIds: ["existing-successor"],
    publicWikiSummary: "",
  };
}

describe("insertion anchors", () => {
  it("anchors a single event to the active gap neighbors", () => {
    const anchored = applyInsertionAnchorsToTimelineEventValues(createValues(), {
      kind: "notch",
      fallbackYear: "",
      helperText: "Between A and B",
      id: "notch-a-b",
      label: "Insert between events",
      nextEventId: "event-b",
      nextEventTitle: "Event B",
      nextBoundaryDay: null,
      nextBoundaryMonth: null,
      nextBoundaryYear: null,
      prefilledDayEnd: "",
      prefilledDayStart: "",
      prefilledMonthEnd: "",
      prefilledMonthStart: "",
      prefilledYearEnd: "",
      prefilledYearStart: "",
      previousBoundaryDay: null,
      previousBoundaryMonth: null,
      previousBoundaryYear: null,
      previousEventId: "event-a",
      previousEventTitle: "Event A",
    });

    expect(anchored.predecessorEventIds).toEqual(["event-a"]);
    expect(anchored.successorEventIds).toEqual(["event-b"]);
  });

  it("reads the direct before/after boundary from insertion context", () => {
    const boundaryIds = getInsertionBoundaryEventIds({
      surroundingEvents: [
        {
          chronologyLabel: "1",
          id: "event-1",
          position: 1,
          relation: "before",
          title: "Event 1",
        },
        {
          chronologyLabel: "2",
          id: "event-2",
          position: 2,
          relation: "before",
          title: "Event 2",
        },
        {
          chronologyLabel: "3",
          id: "event-3",
          position: 3,
          relation: "after",
          title: "Event 3",
        },
        {
          chronologyLabel: "4",
          id: "event-4",
          position: 4,
          relation: "after",
          title: "Event 4",
        },
      ],
    });

    expect(boundaryIds).toEqual({
      nextEventId: "event-3",
      previousEventId: "event-2",
    });
  });

  it("rejects dates that clearly fall before the selected insertion gap", () => {
    const warning = validateInsertionTimelineEventChronology(
      {
        ...createValues(),
        dayStart: 4,
        monthStart: 3,
        yearStart: 2026,
      },
      {
        fallbackYear: "",
        helperText: "Between A and B",
        id: "notch-a-b",
        kind: "notch",
        label: "Insert between events",
        nextBoundaryDay: 5,
        nextBoundaryMonth: 3,
        nextBoundaryYear: 2026,
        nextEventId: "event-b",
        nextEventTitle: "Event B",
        prefilledDayEnd: "",
        prefilledDayStart: "",
        prefilledMonthEnd: "",
        prefilledMonthStart: "",
        prefilledYearEnd: "",
        prefilledYearStart: "",
        previousBoundaryDay: 5,
        previousBoundaryMonth: 3,
        previousBoundaryYear: 2026,
        previousEventId: "event-a",
        previousEventTitle: "Event A",
      }
    );

    expect(warning).toBe("This date begins before the selected insertion point.");
  });
});
