import { describe, expect, it } from "vitest";

import * as applyHelpers from "./apply-helpers.js";
import * as schema from "./schema.js";

describe("validateDraftBundle", () => {
  it("accepts a valid draft bundle", () => {
    const result = schema.validateDraftBundle(
      {
        id: "draft_1",
        projectId: "project_alpha",
        createdAt: "2026-04-07T12:00:00.000Z",
        sourceFile: "notes/chapter-1.md",
        status: "pending-review",
        summary: "Add a new character and extend the summary.",
        proposedChanges: [
          {
            slice: "characters",
            action: "create",
            targetId: "character_mara",
            confidence: "high",
            reason: "Explicitly named in source text.",
            fields: {
              name: "Mara",
              summary: "A cautious scout.",
            },
          },
        ],
      },
      "project_alpha"
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.draft?.projectId).toBe("project_alpha");
  });

  it("reports validation errors for mismatched project ids and malformed changes", () => {
    const result = schema.validateDraftBundle(
      {
        id: "",
        projectId: "wrong_project",
        createdAt: "",
        sourceFile: "",
        status: "queued",
        summary: "",
        proposedChanges: [
          {
            slice: "",
            action: "delete",
            targetId: "",
            confidence: "",
            reason: "",
            fields: null,
          },
        ],
      },
      "project_alpha"
    );

    expect(result.valid).toBe(false);
    expect(result.draft).toBeNull();
    expect(result.errors).toContain(
      "Draft projectId `wrong_project` does not match the current project `project_alpha`."
    );
    expect(result.errors).toContain("proposedChanges[0].fields must be an object.");
  });
});

describe("parseDraftText", () => {
  it("returns a readable JSON parse error", () => {
    const result = schema.parseDraftText("{", "project_alpha");

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Invalid JSON:");
  });
});

describe("applyFieldPatch", () => {
  it("merges append fields, unions arrays, and derives a slug", () => {
    const result = applyHelpers.applyFieldPatch(
      {
        id: "character_mara",
        title: "",
        name: "Mara",
        summary: "Initial summary.",
        tags: ["scout"],
      },
      {
        summaryAppend: "Seen in chapter two.",
        tags: ["lead", "scout"],
      },
      "merge"
    );

    expect(result.summary).toBe("Initial summary.\n\nSeen in chapter two.");
    expect(result.tags).toEqual(["scout", "lead"]);
    expect(result.slug).toBe("mara");
  });
});
