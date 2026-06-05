import { describe, expect, it } from "vitest";

import {
  HARD_TIME_INFERENCE_NOTES,
  buildHardTimeBrainDumpRegressionFixtures,
} from "./hard-time-brain-dump-regression-fixtures";

describe("hard time brain dump regression fixtures", () => {
  it("provides four regression cases", () => {
    const fixtures = buildHardTimeBrainDumpRegressionFixtures();

    expect(fixtures).toHaveLength(4);
  });

  it("keeps the old man duplicate focus in every case", () => {
    const fixtures = buildHardTimeBrainDumpRegressionFixtures();

    expect(fixtures.every((fixture) => fixture.duplicateFocus.includes("old man"))).toBe(true);
  });

  it("includes the core inference notes", () => {
    expect(HARD_TIME_INFERENCE_NOTES).toContain("Preserve the old man / replication technology / digital prison setup.");
  });
});
