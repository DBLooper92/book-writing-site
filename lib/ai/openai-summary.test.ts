import { describe, expect, it } from "vitest";

import {
  buildSummarySystemPrompt,
  buildSummaryUserPrompt,
  extractOpenAiResponseText,
} from "../../electron/ai-utils";

describe("AI summary prompt helpers", () => {
  it("builds a stable system prompt", () => {
    const prompt = buildSummarySystemPrompt();

    expect(prompt).toContain("concise canon summaries");
    expect(prompt).toContain("plain text only");
  });

  it("builds user prompt with optional context", () => {
    const prompt = buildSummaryUserPrompt({
      description: "The gate burns and citizens flee into the lower district.",
      entityType: "Timeline event",
      title: "Night of Embers",
    });

    expect(prompt).toContain("Entity type: Timeline event");
    expect(prompt).toContain("Title: Night of Embers");
    expect(prompt).toContain("Source description");
  });

  it("extracts text from output_text first", () => {
    const text = extractOpenAiResponseText({ output_text: "Short summary." });
    expect(text).toBe("Short summary.");
  });

  it("extracts text from output content when output_text is absent", () => {
    const text = extractOpenAiResponseText({
      output: [
        {
          content: [{ text: "Line one." }, { output_text: "Line two." }],
        },
      ],
    });

    expect(text).toBe("Line one.\nLine two.");
  });

  it("returns empty string for malformed payloads", () => {
    expect(extractOpenAiResponseText({})).toBe("");
    expect(extractOpenAiResponseText(null)).toBe("");
  });
});
