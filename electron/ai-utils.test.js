import { describe, expect, it } from "vitest";

import {
  buildMultiTimelineBrainDumpUserPrompt,
  buildTimelineBrainDumpUserPrompt,
  extractFirstJsonObject,
  splitTextIntoChunks,
} from "./ai-utils";

describe("ai-utils brain dump helpers", () => {
  it("extracts the first json object from mixed text", () => {
    const parsed = extractFirstJsonObject(
      "Ignore this prefix\n{\"event\":{\"title\":\"Arrival\"},\"entities\":[]}\nIgnore suffix"
    );

    expect(parsed).toEqual({
      event: { title: "Arrival" },
      entities: [],
    });
  });

  it("extracts the first valid json object when later text contains another object", () => {
    const parsed = extractFirstJsonObject(
      [
        "prefix text",
        "{\"events\":[{\"title\":\"Arrival\"}],\"warnings\":[]}",
        "middle text",
        "{\"events\":[{\"title\":\"Departure\"}],\"warnings\":[]}",
        "suffix text",
      ].join("\n")
    );

    expect(parsed).toEqual({
      events: [{ title: "Arrival" }],
      warnings: [],
    });
  });

  it("extracts a json array from mixed text", () => {
    const parsed = extractFirstJsonObject(
      "Leading text\n[{\"title\":\"Arrival\"},{\"title\":\"Departure\"}]\nTrailing text"
    );

    expect(parsed).toEqual([{ title: "Arrival" }, { title: "Departure" }]);
  });

  it("returns null for non-json response", () => {
    expect(extractFirstJsonObject("No JSON here")).toBeNull();
  });

  it("includes shape instructions and user text in the prompt", () => {
    const prompt = buildTimelineBrainDumpUserPrompt({
      brainDumpText: "Mara arrives before dawn at the canal safehouse.",
      projectContext: {
        insertionContext: {
          helperText: "Keep the draft inside the selected gap.",
          label: "Gap between arrival and alarm",
          surroundingEvents: [
            {
              chronologyLabel: "2415-04-09",
              id: "before-1",
              position: 1,
              relation: "before",
              title: "Lena sells him across federation lines",
            },
            {
              chronologyLabel: "2416-01-20",
              id: "after-1",
              position: 2,
              relation: "after",
              title: "Elias wakes in the Veyr arena system",
            },
          ],
        },
      },
    });

    expect(prompt).toContain("Return JSON with this shape:");
    expect(prompt).toContain("Mara arrives before dawn at the canal safehouse.");
    expect(prompt).toContain("\"event\"");
    expect(prompt).toContain("\"entities\"");
    expect(prompt).toContain("Treat the last Before event and the first After event as hard boundaries");
    expect(prompt).toContain("Gap between arrival and alarm");
  });

  it("treats one-sided multi-event insertion context as a valid anchor", () => {
    const prompt = buildMultiTimelineBrainDumpUserPrompt({
      chunkText: "Mara follows the convoy, sees the crate swap, and breaks the seal.",
      projectContext: {
        insertionContext: {
          helperText: "Adds a new event after North Gate Market Riot.",
          label: "Extend the chronology",
          surroundingEvents: [
            {
              chronologyLabel: "From 742",
              id: "event-market-riot",
              position: 1,
              relation: "before",
              title: "North Gate Market Riot",
            },
          ],
        },
      },
    });

    expect(prompt).toContain("If only Before events are listed, draft events after the last Before event.");
    expect(prompt).toContain("Treat the last Before event as the anchor. Draft events after it.");
    expect(prompt).toContain("return event drafts even when the nearby timeline context is sparse");
  });

  it("asks the model to preserve source detail and avoid invented dates", () => {
    const singlePrompt = buildTimelineBrainDumpUserPrompt({
      brainDumpText: "An old man offers free tech, gets arrested, and is moved into a digital prison.",
    });
    const multiPrompt = buildMultiTimelineBrainDumpUserPrompt({
      chunkText: "An old man offers free tech, gets arrested, and is moved into a digital prison.",
    });

    expect(singlePrompt).toContain("Do not invent yearStart/yearEnd values");
    expect(singlePrompt).toContain("Preserve specific worldbuilding details");
    expect(multiPrompt).toContain("Do not invent yearStart/yearEnd values");
    expect(multiPrompt).toContain("Preserve specific worldbuilding details");
  });

  it("splits long text into bounded chunks", () => {
    const chunks = splitTextIntoChunks("A".repeat(2500) + "\n\n" + "B".repeat(2500), 2600);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 2600)).toBe(true);
  });
});
