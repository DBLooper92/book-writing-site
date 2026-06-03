function buildSummarySystemPrompt() {
  return [
    "You are helping a story-bible writer create concise canon summaries.",
    "Return plain text only.",
    "Do not use markdown or bullet points unless the source clearly requires a list.",
    "Keep the summary factual, coherent, and easy to scan.",
    "Target 2-4 sentences.",
  ].join(" ");
}

function buildTimelineBrainDumpSystemPrompt() {
  return [
    "You are a story-bible timeline extraction assistant.",
    "Return JSON only with no markdown and no wrapper text.",
    "Extract exactly one timeline event draft from the input.",
    "Prefer the smallest coherent event that fits the insertion gap.",
    "Do not merge multiple distinct beats into one event unless the dump clearly describes one event with multiple facets.",
    "Use null/empty strings when unknown, and never invent existing record IDs.",
    "Use confidence from: low, medium, high, confirmed.",
  ].join(" ");
}

function buildMultiTimelineBrainDumpSystemPrompt() {
  return [
    "You are extracting multiple timeline events from a large story brain dump chunk.",
    "Return JSON only with no markdown or wrapper text.",
    "Extract 0..N events from this chunk in chronological order when possible.",
    "When the chunk contains concrete story beats, extract them as drafts unless they clearly contradict the selected insertion gap.",
    "Keep every extracted event confined to the selected insertion gap when both before and after boundaries exist.",
    "If the selected insertion point only has Before events, treat it as extending the chronology after the last Before event.",
    "If the selected insertion point only has After events, treat it as inserting before the first After event.",
    "Do not return zero events just because one side of the insertion context is missing or the brain dump mentions not-yet-existing canon names.",
    "If the dump mentions material that clearly belongs outside a two-sided gap, omit only that material and surface it as a warning instead of stretching the chronology.",
    "Split distinct beats into separate events when they belong at different points in the same gap.",
    "Do not invent IDs. Use confidence values: low, medium, high, confirmed.",
    "Also suggest predecessor/successor relationships when clearly implied.",
  ].join(" ");
}

function buildTimelineBrainDumpUserPrompt(input) {
  const schemaExample = {
    event: {
      title: "string",
      summary: "string",
      description: "string",
      eventType:
        "inciting_incident|discovery|revelation|conflict|turning_point|aftermath|travel|political|personal|world_event|other",
      yearStart: "string",
      monthStart: "string",
      dayStart: "string",
      yearEnd: "string",
      monthEnd: "string",
      dayEnd: "string",
      chronologyOrder: "string",
      timeOfDayLabel: "string",
      displayDateLabel: "string",
      causes: ["string"],
      consequences: ["string"],
      publicWikiSummary: "string",
    },
    entities: [
      {
        target:
          "era|book|chapter|scene|character|location|faction|culture|religion|technology|plotThread|theme",
        mention: "string",
        summary: "string",
        description: "string",
        confidence: "low|medium|high|confirmed",
        reason: "string",
      },
    ],
  };

  return [
    "Return JSON with this shape:",
    JSON.stringify(schemaExample, null, 2),
    "",
    "Use the insertion context, when present, to keep the draft(s) between the surrounding events in chronological order.",
    "Do not move the new event outside that local window unless the brain dump clearly requires a wider span.",
    "If you set chronologyOrder for an event, you must also set yearStart and yearEnd to a concrete year from the local insertion window.",
    "Do not leave yearStart/yearEnd empty for any extracted event when the insertion context provides nearby dated events.",
    "",
    buildInsertionContextSection(input?.projectContext),
    "",
    "Brain dump text:",
    String(input?.brainDumpText ?? ""),
  ].join("\n");
}

function buildMultiTimelineBrainDumpUserPrompt(input) {
  const schemaExample = {
    events: [
      {
        event: {
          title: "string",
          summary: "string",
          description: "string",
          eventType:
            "inciting_incident|discovery|revelation|conflict|turning_point|aftermath|travel|political|personal|world_event|other",
          yearStart: "string",
          monthStart: "string",
          dayStart: "string",
          yearEnd: "string",
          monthEnd: "string",
          dayEnd: "string",
          chronologyOrder: "string",
          timeOfDayLabel: "string",
          displayDateLabel: "string",
          causes: ["string"],
          consequences: ["string"],
          publicWikiSummary: "string",
        },
        entities: [
          {
            target:
              "era|book|chapter|scene|character|location|faction|culture|religion|technology|plotThread|theme",
            mention: "string",
            summary: "string",
            description: "string",
            confidence: "low|medium|high|confirmed",
            reason: "string",
          },
        ],
      },
    ],
    crossEventLinks: [
      {
        fromTitle: "string",
        toTitle: "string",
        confidence: "low|medium|high|confirmed",
        reason: "string",
      },
    ],
    warnings: ["string"],
  };

  return [
    `Chunk ${input?.chunkIndex ?? 1} of ${input?.chunkTotal ?? 1}`,
    "Return JSON with this shape:",
    JSON.stringify(schemaExample, null, 2),
    "",
    "Use the insertion context, when present, to keep the extracted events localized to the chosen timeline gap.",
    "Preserve the surrounding event order and only extend beyond a two-sided local window if the brain dump clearly demands it.",
    "If only Before events are listed, draft events after the last Before event.",
    "If only After events are listed, draft events before the first After event.",
    "If there are concrete event beats in the chunk, return event drafts even when the nearby timeline context is sparse.",
    "If an extracted event uses chronologyOrder, always include a concrete yearStart and yearEnd from the surrounding window.",
    "Never output chronologyOrder without yearStart/yearEnd.",
    "",
    buildInsertionContextSection(input?.projectContext),
    "",
    "Chunk text:",
    String(input?.chunkText ?? ""),
  ].join("\n");
}

function buildInsertionContextSection(projectContext) {
  const insertionContext = projectContext?.insertionContext;

  if (
    !insertionContext ||
    !Array.isArray(insertionContext.surroundingEvents) ||
    insertionContext.surroundingEvents.length === 0
  ) {
    return "";
  }

  const lines = ["Insertion context:"];

  if (typeof insertionContext.label === "string" && insertionContext.label.trim()) {
    lines.push(`Gap label: ${insertionContext.label.trim()}`);
  }

  if (typeof insertionContext.helperText === "string" && insertionContext.helperText.trim()) {
    lines.push(`Gap note: ${insertionContext.helperText.trim()}`);
  }

  lines.push("Nearby timeline events:");

  for (const event of insertionContext.surroundingEvents) {
    if (!event || typeof event !== "object") {
      continue;
    }

    const relation = event.relation === "after" ? "After" : "Before";
    const position =
      typeof event.position === "number" && Number.isFinite(event.position)
        ? `#${event.position}`
        : "#?";
    const title = String(event.title ?? "").trim() || "Untitled event";
    const chronologyLabel = String(event.chronologyLabel ?? "").trim();

    lines.push(
      `${relation} ${position}: ${title}${chronologyLabel ? ` (${chronologyLabel})` : ""}`
    );
  }

  lines.push("");
  const hasBefore = insertionContext.surroundingEvents.some((event) => event?.relation !== "after");
  const hasAfter = insertionContext.surroundingEvents.some((event) => event?.relation === "after");

  if (hasBefore && hasAfter) {
    lines.push(
      "Treat the last Before event and the first After event as hard boundaries for the extracted draft(s)."
    );
  } else if (hasBefore) {
    lines.push("Treat the last Before event as the anchor. Draft events after it.");
  } else if (hasAfter) {
    lines.push("Treat the first After event as the anchor. Draft events before it.");
  }

  return lines.join("\n");
}

function extractFirstJsonObject(rawText) {
  const text = String(rawText ?? "").trim();

  if (!text) {
    return null;
  }

  const directParse = tryParseJsonCandidate(text);

  if (directParse !== null) {
    return directParse;
  }

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (char !== "{" && char !== "[") {
      continue;
    }

    const endIndex = findMatchingJsonEndIndex(text, index);

    if (endIndex === null) {
      continue;
    }

    const candidate = text.slice(index, endIndex + 1);
    const parsed = tryParseJsonCandidate(candidate);

    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
}

function splitTextIntoChunks(rawText, maxChunkChars = 4200) {
  const text = String(rawText ?? "").trim();

  if (!text) {
    return [];
  }

  const paragraphs = text
    .split(/\n{2,}/g)
    .map((value) => value.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return [text.slice(0, maxChunkChars)];
  }

  const chunks = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const next = current ? `${current}\n\n${paragraph}` : paragraph;

    if (next.length <= maxChunkChars) {
      current = next;
      continue;
    }

    if (current) {
      chunks.push(current);
      current = "";
    }

    if (paragraph.length <= maxChunkChars) {
      current = paragraph;
      continue;
    }

    let index = 0;

    while (index < paragraph.length) {
      const piece = paragraph.slice(index, index + maxChunkChars);
      chunks.push(piece);
      index += maxChunkChars;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function buildSummaryUserPrompt(input) {
  const context = [
    input.entityType ? `Entity type: ${input.entityType}` : null,
    input.title ? `Title: ${input.title}` : null,
    "Source description:",
    input.description,
  ]
    .filter(Boolean)
    .join("\n\n");

  return `${context}\n\nWrite a concise summary suitable for the Summary field.`;
}

function extractOpenAiResponseText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const outputItems = Array.isArray(payload?.output) ? payload.output : [];
  const extractedText = outputItems
    .flatMap((item) => (Array.isArray(item?.content) ? item.content : []))
    .map((contentItem) => {
      if (typeof contentItem?.text === "string") {
        return contentItem.text;
      }

      if (typeof contentItem?.output_text === "string") {
        return contentItem.output_text;
      }

      return "";
    })
    .join("\n")
    .trim();

  return extractedText || "";
}

function tryParseJsonCandidate(rawText) {
  try {
    const parsed = JSON.parse(rawText);

    if (Array.isArray(parsed) || (typeof parsed === "object" && parsed !== null)) {
      return parsed;
    }
  } catch {
    // Ignore parse failures and keep scanning for a valid JSON block.
  }

  return null;
}

function findMatchingJsonEndIndex(text, startIndex) {
  const openingChar = text[startIndex];

  if (openingChar !== "{" && openingChar !== "[") {
    return null;
  }

  const stack = [openingChar];
  let inString = false;
  let escaped = false;

  for (let index = startIndex + 1; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{" || char === "[") {
      stack.push(char);
      continue;
    }

    if (char === "}" || char === "]") {
      const openChar = stack.pop();

      if (!openChar || !isMatchingJsonBracket(openChar, char)) {
        return null;
      }

      if (stack.length === 0) {
        return index;
      }
    }
  }

  return null;
}

function isMatchingJsonBracket(openChar, closeChar) {
  return (openChar === "{" && closeChar === "}") || (openChar === "[" && closeChar === "]");
}

module.exports = {
  buildMultiTimelineBrainDumpSystemPrompt,
  buildMultiTimelineBrainDumpUserPrompt,
  buildTimelineBrainDumpSystemPrompt,
  buildTimelineBrainDumpUserPrompt,
  buildSummarySystemPrompt,
  buildSummaryUserPrompt,
  extractFirstJsonObject,
  extractOpenAiResponseText,
  splitTextIntoChunks,
};
