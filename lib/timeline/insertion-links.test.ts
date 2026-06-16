import { describe, expect, it } from "vitest";

import { replaceTimelineLinkIds } from "./insertion-links";

describe("insertion links", () => {
  it("replaces the old direct boundary link with the inserted event", () => {
    expect(replaceTimelineLinkIds(["event-4", "event-5"], "event-5", "event-new")).toEqual([
      "event-4",
      "event-new",
    ]);
  });

  it("rewires both sides of the gap to the inserted event", () => {
    const previousSuccessorEventIds = replaceTimelineLinkIds(
      ["event-5"],
      "event-5",
      "event-new"
    );
    const nextPredecessorEventIds = replaceTimelineLinkIds(["event-4"], "event-4", "event-new");

    expect(previousSuccessorEventIds).toEqual(["event-new"]);
    expect(nextPredecessorEventIds).toEqual(["event-new"]);
  });
});
