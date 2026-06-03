import { describe, expect, it } from "vitest";

import { buildValidationFixtures } from "./brain-dump-validation-fixtures";

describe("brain dump validation fixtures", () => {
  it("provides the expected scenario counts", () => {
    const fixtures = buildValidationFixtures();

    expect(fixtures.single).toHaveLength(10);
    expect(fixtures.multi).toHaveLength(10);
    expect(fixtures.stress).toHaveLength(4);
  });

  it("ensures stress fixtures are large enough to trigger chunking behavior", () => {
    const fixtures = buildValidationFixtures();

    expect(fixtures.stress.every((scenario) => scenario.text.length > 4200)).toBe(true);
  });
});
