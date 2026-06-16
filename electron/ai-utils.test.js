import { describe, expect, it } from "vitest";

import {
  buildBrainDumpNormalizationSystemPrompt,
  buildBrainDumpNormalizationUserPrompt,
  buildMultiTimelineBrainDumpSystemPrompt,
  buildMultiTimelineBrainDumpReviewSystemPrompt,
  buildMultiTimelineBrainDumpReviewUserPrompt,
  buildMultiTimelineBrainDumpUserPrompt,
  buildTimelineBrainDumpUserPrompt,
  extractFirstJsonObject,
  extractJsonObjectsFromText,
  getBrainDumpEntityCreateTitle,
  normalizeBrainDumpNormalizationOutput,
  normalizeMultiTimelineBrainDumpChunkCandidates,
  normalizeMultiTimelineBrainDumpChunkOutput,
  splitBrainDumpIntoParagraphBlocks,
  splitTextIntoChunks,
} from "./ai-utils";

describe("ai-utils brain dump helpers", () => {
  it("requires multi-event chunks to use the events-array envelope", () => {
    const prompt = buildMultiTimelineBrainDumpSystemPrompt();

    expect(prompt).toContain("top-level JSON object MUST contain an events array");
    expect(prompt).toContain("Never return a bare event object");
  });

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
      projectTitle: "NeuroVerse Series",
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
    expect(prompt).toContain("Project title: NeuroVerse Series");
    expect(prompt).toContain("\"event\"");
    expect(prompt).toContain("\"entities\"");
    expect(prompt).toContain("Treat the last Before event and the first After event as hard boundaries");
    expect(prompt).toContain("Gap between arrival and alarm");
  });

  it("builds a normalization prompt that groups paragraphs into sections", () => {
    const sourceText = "Premise line.\n\nMilo is a mechanic.\n\nThe ship leaves at night.";
    const paragraphBlocks = splitBrainDumpIntoParagraphBlocks(sourceText);
    const prompt = buildBrainDumpNormalizationUserPrompt({
      chunkText: sourceText,
      paragraphBlocks,
      projectTitle: "NeuroVerse Series",
    });

    expect(buildBrainDumpNormalizationSystemPrompt()).toContain(
      "Every source paragraph must be assigned to exactly one section"
    );
    expect(prompt).toContain("Paragraph source text:");
    expect(prompt).toContain("P1: Premise line.");
    expect(prompt).toContain("P2: Milo is a mechanic.");
    expect(prompt).toContain("P3: The ship leaves at night.");
    expect(prompt).toContain("manuscript_structure");
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
    expect(prompt).toContain("Do not return a single bare event object");
  });

  it("teaches the multi-event prompt to preserve manuscript structure", () => {
    const prompt = buildMultiTimelineBrainDumpUserPrompt({
      chunkText: "Book 1 begins, then Book 2 follows as novella 2.",
      projectTitle: "NeuroVerse Series",
    });

    expect(prompt).toContain("Project title: NeuroVerse Series");
    expect(prompt).toContain("manuscript structure");
    expect(prompt).toContain("suggestedAction");
    expect(prompt).toContain("suggestedCreateFields");
    expect(prompt).toContain("For book entities, use a descriptive working title");
    expect(prompt).toContain(
      "For chapter entities, use them only when the chunk clearly describes a chapter-scale unit or explicit chapter marker."
    );
    expect(prompt).toContain("For distinct named people, places, factions, technologies, books, chapters, and scenes, prefer link or create.");
  });

  it("can build a compact multi-event prompt without the raw chunk text", () => {
    const prompt = buildMultiTimelineBrainDumpUserPrompt({
      chunkText: "A slow chapter that is at risk of timing out.",
      includeChunkText: false,
      normalizedSections: [
        {
          sectionType: "events",
          label: "Events",
          paragraphIds: ["P1"],
          paragraphs: [{ paragraphId: "P1", text: "A slow chapter that is at risk of timing out." }],
          confidence: "high",
          notes: "",
        },
      ],
    });

    expect(prompt).toContain("Chunk text omitted in this fallback pass");
  });

  it("builds a second-pass review prompt for weak drafts", () => {
    const systemPrompt = buildMultiTimelineBrainDumpReviewSystemPrompt();
    const userPrompt = buildMultiTimelineBrainDumpReviewUserPrompt({
      chunkText: "The old man becomes important again when the prison escape begins.",
      draft: {
        event: {
          title: "Story",
          summary: "Something happens.",
        },
        entities: [],
      },
      projectTitle: "NeuroVerse Series",
      reviewReasons: ["Generic title", "Thin summary"],
    });

    expect(systemPrompt).toContain("second-pass reviewer");
    expect(systemPrompt).toContain("Keep the underlying beat faithful");
    expect(systemPrompt).toContain("Do not infer year values from series premise");
    expect(userPrompt).toContain("Review reasons: Generic title; Thin summary");
    expect(userPrompt).toContain("Rewrite the draft in place");
    expect(userPrompt).toContain("Original extracted draft:");
    expect(userPrompt).toContain("The old man becomes important again");
    expect(userPrompt).toContain("Do not infer year values from series premise");
  });

  it("includes session reference context when present", () => {
    const prompt = buildTimelineBrainDumpUserPrompt({
      brainDumpText: "Mara returns to the flooded hall.",
      projectContext: {
        referenceContext: {
          cards: [
            {
              bookmarked: true,
              cardId: "card-1",
              cardType: "manual",
              publishedTimelineEventId: null,
              status: "ready",
              summary: "Mara finds the key in the chapel.",
              text: "Mara finds the key in the chapel.",
              title: "Manual note",
            },
          ],
          relatedEvents: [
            {
              bookmarkCollectionId: null,
              bookmarked: false,
              description: "The chapel floods and the key is lost again.",
              eventId: "event-1",
              relation: "description",
              summary: "The chapel floods.",
              title: "Flooded Chapel",
            },
          ],
        },
      },
    });

    expect(prompt).toContain("Session reference context:");
    expect(prompt).toContain("Earlier cards in this composer:");
    expect(prompt).toContain("Potentially related timeline events discovered from linked entities:");
    expect(prompt).toContain("Manual note");
    expect(prompt).toContain("Flooded Chapel");
  });

  it("normalizes section output into exact paragraph references", () => {
    const paragraphs = splitBrainDumpIntoParagraphBlocks(
      "Premise line.\n\nMilo is a mechanic.\n\nThe ship leaves at night."
    );
    const normalized = normalizeBrainDumpNormalizationOutput(
      {
        sections: [
          { sectionType: "premise", label: "Premise", paragraphIds: ["P1"], confidence: "high" },
          { sectionType: "characters", label: "Cast", paragraphIds: ["P2"], confidence: "high" },
        ],
      },
      paragraphs
    );

    expect(normalized.sections.map((section) => section.sectionType)).toEqual([
      "premise",
      "characters",
      "other",
    ]);
    expect(normalized.sections[0].paragraphs[0].text).toBe("Premise line.");
    expect(normalized.sections[1].paragraphs[0].text).toBe("Milo is a mechanic.");
    expect(normalized.sections[2].paragraphIds).toEqual(["P3"]);
    expect(normalized.warnings).toContain("Recovered 1 paragraph the model did not classify.");
  });

  it("prefers an explicit suggested create title when provided by the model", () => {
    expect(
      getBrainDumpEntityCreateTitle(
        {
          mention: "story",
          suggestedCreateFields: {
            titleOrName: "NeuroVerse Book 1: The Gauntlet",
          },
        },
        "fallback"
      )
    ).toBe("NeuroVerse Book 1: The Gauntlet");
  });

  it("extracts every complete json object from mixed text", () => {
    const parsed = extractJsonObjectsFromText(
      [
        "prefix text",
        "{\"event\":{\"title\":\"Arrival\"},\"entities\":[]}",
        "middle text",
        "{\"event\":{\"title\":\"Feast\"},\"entities\":[]}",
        "truncated tail {\"event\":{\"title\":\"Mirror Well\"}",
      ].join("\n")
    );

    const normalized = normalizeMultiTimelineBrainDumpChunkCandidates(parsed);

    expect(normalized.events.map((entry) => entry.event.title)).toEqual([
      "Arrival",
      "Feast",
      "Mirror Well",
    ]);
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

  it("recovers a bare single-event chunk response", () => {
    const normalized = normalizeMultiTimelineBrainDumpChunkOutput({
      event: {
        title: "Lord Evren Arrives at Glass Keep",
        summary: "Evren reaches the pilgrim door.",
      },
      entities: [
        {
          target: "character",
          mention: "Lord Evren",
        },
      ],
    });

    expect(normalized.events).toHaveLength(1);
    expect(normalized.events[0].event.title).toBe("Lord Evren Arrives at Glass Keep");
    expect(normalized.events[0].entities[0].mention).toBe("Lord Evren");
    expect(normalized.warnings).toContain(
      "Recovered one chunk event from a non-standard single-event JSON object."
    );
  });

  it("normalizes top-level event arrays and direct event entries", () => {
    const normalized = normalizeMultiTimelineBrainDumpChunkOutput([
      {
        title: "Market Riot",
        summary: "Refugees crowd the lower market.",
      },
      {
        event: {
          title: "Archive Break-In",
          summary: "Cassia and Nenn enter the upper archive.",
        },
        entities: [],
      },
    ]);

    expect(normalized.events.map((entry) => entry.event.title)).toEqual([
      "Market Riot",
      "Archive Break-In",
    ]);
    expect(normalized.warnings).toContain("Recovered chunk events from a top-level JSON array.");
  });

  it("normalizes multiple parsed chunk candidates into one recovered chunk", () => {
    const normalized = normalizeMultiTimelineBrainDumpChunkCandidates([
      {
        event: {
          title: "Arrival at the Pilgrim Door",
          summary: "Evren gets through the small door.",
        },
        entities: [],
      },
      {
        event: {
          title: "Prism Hall Feast Omen",
          summary: "Cassia sees the orchard window omen.",
        },
        entities: [],
      },
    ]);

    expect(normalized.events.map((entry) => entry.event.title)).toEqual([
      "Arrival at the Pilgrim Door",
      "Prism Hall Feast Omen",
    ]);
  });
});
