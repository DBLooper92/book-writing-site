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
    "Do not turn every sentence into its own event.",
    "Merge adjacent setup, exposition, or planning lines when they belong to the same beat.",
    "Split only when the dump clearly moves to a new incident, decision, consequence, or time step.",
    "Preserve concrete beats, named people, places, systems, and recurring mechanics instead of collapsing them into generic prose.",
    "When the dump is mostly series-level planning, keep the event high-level and attach manuscript-structure entity suggestions instead of flattening everything into one generic story note.",
    "When the text mentions books, novellas, volumes, parts, acts, or chapters, reflect that in the event and entity suggestions rather than reducing it to a generic story label.",
    "When you create entity suggestions, set suggestedAction to create, link, ignore, ambiguous, or unresolved as appropriate.",
    "For distinct named people, places, factions, technologies, books, chapters, and scenes, prefer link or create. Reserve unresolved for vague mentions that cannot be safely identified.",
    "When you suggest a new record, fill suggestedCreateFields.titleOrName with a concise working title that is more specific than the raw mention when the text supports it.",
    "Do not invent dates, year spans, or chronologyOrder values; leave them blank unless the source or insertion context provides them.",
    "Do not infer a year from the series premise, genre, or surrounding worldbuilding if the chunk does not explicitly state one.",
    "Use null/empty strings when unknown, and never invent existing record IDs.",
    "Use confidence from: low, medium, high, confirmed.",
  ].join(" ");
}

const BRAIN_DUMP_SECTION_TYPES = Object.freeze([
  "premise",
  "characters",
  "events",
  "worldbuilding",
  "manuscript_structure",
  "open_questions",
  "other",
]);

function splitBrainDumpIntoParagraphBlocks(rawText) {
  const text = String(rawText ?? "").trim();

  if (!text) {
    return [];
  }

  return text
    .split(/\n{2,}/g)
    .map((paragraph, index) => ({
      paragraphId: `P${index + 1}`,
      text: paragraph.trim(),
    }))
    .filter((paragraph) => paragraph.text.length > 0);
}

function buildBrainDumpNormalizationSystemPrompt() {
  return [
    "You are a brain-dump normalization assistant for a story bible app.",
    "Return JSON only with no markdown and no wrapper text.",
    "Group the provided paragraphs into clean sections without inventing facts.",
    "Every source paragraph must be assigned to exactly one section.",
    "Preserve the original paragraph order.",
    "Use exact paragraph IDs from the input. Do not invent new paragraph IDs.",
    "Do not rewrite source text; only classify and group it.",
    "Use section types from: premise, characters, events, worldbuilding, manuscript_structure, open_questions, other.",
    "Use manuscript_structure only when the source clearly discusses books, chapters, scenes, acts, parts, or similar structure.",
    "Use open_questions for explicit uncertainties or unresolved notes from the user.",
    "When a paragraph mixes multiple ideas, place it in the section that best matches the dominant idea.",
    "When a paragraph is mixed or unclear, use other and explain why in notes.",
    "Use confidence values: low, medium, high, confirmed.",
  ].join(" ");
}

function buildBrainDumpNormalizationUserPrompt(input) {
  const projectTitle = asString(input?.projectTitle);
  const paragraphBlocks = Array.isArray(input?.paragraphBlocks) ? input.paragraphBlocks : [];
  const sourceList = paragraphBlocks
    .map((paragraph) => `${paragraph.paragraphId}: ${String(paragraph.text ?? "").trim()}`)
    .join("\n");
  const schemaExample = {
    sections: [
      {
        sectionType: "premise|characters|events|worldbuilding|manuscript_structure|open_questions|other",
        label: "string",
        paragraphIds: ["P1"],
        confidence: "low|medium|high|confirmed",
        notes: "string",
      },
    ],
    warnings: ["string"],
  };

  return [
    "Return JSON with this shape:",
    JSON.stringify(schemaExample, null, 2),
    "",
    "Every paragraphId must appear in exactly one section.",
    "Do not invent new paragraph IDs or source text.",
    "Do not paraphrase the paragraphs; only classify and group them.",
    "Keep section order aligned to the source order.",
    "If a paragraph contains a major story beat, place it under events.",
    "If a paragraph is mostly character facts or relationships, place it under characters.",
    "If it is mostly setting, systems, history, or rules, place it under worldbuilding.",
    "If it is about books, chapters, scenes, acts, parts, or similar manuscript structure, place it under manuscript_structure.",
    "If it is mostly a premise statement, place it under premise.",
    "If it is mostly unresolved notes, questions, or uncertainty, place it under open_questions.",
    "If it does not fit cleanly, use other and explain why in notes.",
    projectTitle ? `Project title: ${projectTitle}` : null,
    projectTitle
      ? "Use the project title only as a light naming hint; do not invent facts from it."
      : null,
    "",
    "Paragraph source text:",
    sourceList,
  ].join("\n");
}

function normalizeConfidence(value) {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (normalized === "confirmed") {
    return "confirmed";
  }

  if (normalized === "high") {
    return "high";
  }

  if (normalized === "medium") {
    return "medium";
  }

  return "low";
}

function normalizeBrainDumpSectionType(value) {
  const normalized = String(value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");

  return BRAIN_DUMP_SECTION_TYPES.includes(normalized) ? normalized : "other";
}

function normalizeBrainDumpNormalizationOutput(parsed, paragraphBlocks) {
  const parsedSections = Array.isArray(parsed?.sections)
    ? parsed.sections
    : Array.isArray(parsed)
      ? parsed
      : hasEventDraftShape(parsed)
        ? [parsed]
        : [];
  const paragraphById = new Map(
    Array.isArray(paragraphBlocks)
      ? paragraphBlocks.map((paragraph, index) => [
          String(paragraph?.paragraphId ?? `P${index + 1}`),
          {
            paragraphId: String(paragraph?.paragraphId ?? `P${index + 1}`),
            text: String(paragraph?.text ?? "").trim(),
          },
        ])
      : []
  );
  const warnings = asStringArray(parsed?.warnings);
  const normalizedSections = [];
  const seenParagraphIds = new Set();
  const recoveredWarnings = [];

  for (const section of parsedSections) {
    if (!section || typeof section !== "object") {
      continue;
    }

    const paragraphIds = Array.from(
      new Set(
        asStringArray(section.paragraphIds).filter((paragraphId) => paragraphById.has(paragraphId))
      )
    );

    paragraphIds.forEach((paragraphId) => seenParagraphIds.add(paragraphId));

    if (paragraphIds.length === 0) {
      continue;
    }

    normalizedSections.push({
      confidence: normalizeConfidence(section.confidence),
      label: asString(section.label) || "Unlabeled section",
      notes: asString(section.notes),
      paragraphIds,
      paragraphs: paragraphIds.map((paragraphId) => paragraphById.get(paragraphId)).filter(Boolean),
      sectionType: normalizeBrainDumpSectionType(section.sectionType),
    });
  }

  const missingParagraphIds = Array.from(paragraphById.keys()).filter(
    (paragraphId) => !seenParagraphIds.has(paragraphId)
  );

  if (missingParagraphIds.length > 0) {
    normalizedSections.push({
      confidence: "low",
      label: "Unclassified source text",
      notes: "Fallback section created because the model omitted one or more source paragraphs.",
      paragraphIds: missingParagraphIds,
      paragraphs: missingParagraphIds.map((paragraphId) => paragraphById.get(paragraphId)).filter(Boolean),
      sectionType: "other",
    });
    recoveredWarnings.push(
      `Recovered ${missingParagraphIds.length} paragraph${missingParagraphIds.length === 1 ? "" : "s"} the model did not classify.`
    );
  }

  return {
    sections: normalizedSections,
    warnings: [...warnings, ...recoveredWarnings],
  };
}

function buildMultiTimelineBrainDumpSystemPrompt() {
  return [
    "You are extracting multiple timeline events from a large story brain dump chunk.",
    "Return JSON only with no markdown or wrapper text.",
    "The top-level JSON object MUST contain an events array. Never return a bare event object.",
    "Each events array item MUST contain an event object and an entities array.",
    "The input will include normalized source sections; use their order and paragraph references as the main grounding for event ordering.",
    "Extract 0..N events from this chunk in chronological order when possible.",
    "When the chunk contains concrete story beats, extract them as drafts unless they clearly contradict the selected insertion gap.",
    "Keep every extracted event confined to the selected insertion gap when both before and after boundaries exist.",
    "If the selected insertion point only has Before events, treat it as extending the chronology after the last Before event.",
    "If the selected insertion point only has After events, treat it as inserting before the first After event.",
    "Do not return zero events just because one side of the insertion context is missing or the brain dump mentions not-yet-existing canon names.",
    "If the dump mentions material that clearly belongs outside a two-sided gap, omit only that material and surface it as a warning instead of stretching the chronology.",
    "Do not turn each paragraph or sentence into its own event.",
    "Merge adjacent setup, exposition, or planning lines when they belong to the same beat.",
    "Split distinct beats into separate events only when they represent different incidents, decisions, consequences, or clear time steps.",
    "Prefer a small set of meaningful events per chunk over a sentence-by-sentence breakdown.",
    "If a beat is underdeveloped, keep it attached to the strongest surrounding detail rather than emitting a flimsy fragment; the internal review pass will refine weak drafts later.",
    "Preserve concrete source details such as social systems, training regimes, recurring competitions, incentives, manuscript structure, and worldbuilding mechanics when they materially change the story.",
    "When the source mentions books, novellas, volumes, parts, acts, chapters, or scenes, emit manuscript-structure entity suggestions when appropriate instead of burying those ideas inside timeline prose.",
    "For book entities, use a descriptive working title. Do not default to generic labels like 'story' or 'book' if the text provides a better phrase.",
    "For chapter entities, use them only when the chunk clearly describes a chapter-scale unit or explicit chapter marker.",
    "Do not invent dates, year spans, or chronologyOrder values; leave them blank unless the source or insertion context provides them.",
    "Do not infer a year from the series premise, genre, or surrounding worldbuilding if the chunk does not explicitly state one.",
    "Do not invent IDs. Use confidence values: low, medium, high, confirmed.",
    "Also suggest predecessor/successor relationships when clearly implied.",
  ].join(" ");
}

function buildMultiTimelineBrainDumpReviewSystemPrompt() {
  return [
    "You are a second-pass reviewer for story-bible timeline extraction.",
    "Return JSON only with no markdown or wrapper text.",
    "Refine exactly one candidate event draft from the input.",
    "Keep the underlying beat faithful to the source while improving specificity, clarity, and canon usefulness.",
    "Prefer stronger titles, cleaner summaries, and better entity normalization over vague prose.",
    "If the draft is too broad, tighten it to the strongest beat and mention the limitation in warnings.",
    "If the source clearly supports a better book, chapter, scene, or arc label, preserve it in the entity suggestions.",
    "If the draft is already strong, keep the beat and only polish obvious rough edges.",
    "Do not invent dates, year spans, IDs, or unsupported canon.",
    "Do not infer year values from series premise, genre, or surrounding worldbuilding unless the source chunk explicitly states them.",
    "Use confidence values: low, medium, high, confirmed.",
  ].join(" ");
}

function buildTimelineBrainDumpUserPrompt(input) {
  const projectTitle = asString(input?.projectTitle);
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
        suggestedAction: "create|link|ignore|ambiguous|unresolved",
        suggestedCreateFields: {
          titleOrName: "string",
          summary: "string",
          description: "string",
          publicWikiSummary: "string",
        },
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
    "If you set chronologyOrder for an event, only do so when the source or insertion context supplies a concrete year range.",
    "Do not invent yearStart/yearEnd values; leave them blank unless the source or insertion context provides concrete dates or years.",
    "Do not infer a year from the series premise, genre, or surrounding worldbuilding if the chunk does not explicitly state one.",
    "Preserve specific worldbuilding details, recurring systems, and secondary mechanics when they matter to the story instead of compressing them into generic summary text.",
    "When the text is primarily series planning, use concise high-level event language and let entity suggestions carry the book/chapter/scene structure.",
    "For book entities, name the descriptive work or arc instead of using generic placeholders.",
    "For chapter entities, only suggest them when the dump clearly supports chapter-scale structure.",
    "When you create entity suggestions, set suggestedAction to create, link, ignore, ambiguous, or unresolved as appropriate.",
    "For distinct named people, places, factions, technologies, books, chapters, and scenes, prefer link or create. Reserve unresolved for vague mentions that cannot be safely identified.",
    "When you suggest a new record, fill suggestedCreateFields.titleOrName with a concise working title that is more specific than the raw mention when the text supports it.",
    "Favor stable coarse drafts over ultra-fine fragments; a second review pass will polish weak items.",
    "",
    projectTitle ? `Project title: ${projectTitle}` : null,
    projectTitle
      ? "Use the project title as a naming hint only when the dump is defining the series itself."
      : null,
    "",
    buildReferenceContextSection(input?.projectContext?.referenceContext ?? null),
    "",
    buildInsertionContextSection(input?.projectContext),
    "",
    "Brain dump text:",
    String(input?.brainDumpText ?? ""),
  ].join("\n");
}

function buildMultiTimelineBrainDumpUserPrompt(input) {
  const projectTitle = asString(input?.projectTitle);
  const normalizedSections = Array.isArray(input?.normalizedSections) ? input.normalizedSections : [];
  const includeChunkText = input?.includeChunkText !== false;
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
            suggestedAction: "create|link|ignore|ambiguous|unresolved",
            suggestedCreateFields: {
              titleOrName: "string",
              summary: "string",
              description: "string",
              publicWikiSummary: "string",
            },
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
    "Important: always return the top-level object exactly with events, crossEventLinks, and warnings keys.",
    "Do not return a single bare event object even when the chunk has only one event.",
    "When a chunk has several concrete beats, include every distinct beat as a separate item in events.",
    "",
    normalizedSections.length > 0 ? "Normalized source sections:" : null,
    normalizedSections.length > 0 ? JSON.stringify(normalizedSections, null, 2) : null,
    normalizedSections.length > 0
      ? "Use the normalized source sections as your primary grounding. Preserve their order when reconstructing chronology."
      : null,
    "",
    "Use the insertion context, when present, to keep the extracted events localized to the chosen timeline gap.",
    "Preserve the surrounding event order and only extend beyond a two-sided local window if the brain dump clearly demands it.",
    "If only Before events are listed, draft events after the last Before event.",
    "If only After events are listed, draft events before the first After event.",
    "If there are concrete event beats in the chunk, return event drafts even when the nearby timeline context is sparse.",
    "Only use chronologyOrder when the source or insertion context supplies a concrete yearStart and yearEnd.",
    "Do not invent yearStart/yearEnd values; leave them blank unless the source or insertion context provides concrete dates or years.",
    "Never output chronologyOrder without yearStart/yearEnd from the source or insertion context.",
    "Do not infer a year from the series premise, genre, or surrounding worldbuilding if the chunk does not explicitly state one.",
    "Preserve specific worldbuilding details, recurring systems, incentives, secondary mechanics, and manuscript structure when they matter to the story instead of dropping them.",
    "When the source mentions books, novellas, volumes, parts, acts, chapters, or scenes, emit manuscript-structure entity suggestions when appropriate instead of burying those ideas inside timeline prose.",
    "For book entities, use a descriptive working title. Do not default to generic labels like 'story' or 'book' if the text provides a better phrase.",
    "For chapter entities, use them only when the chunk clearly describes a chapter-scale unit or explicit chapter marker.",
    "When you create entity suggestions, set suggestedAction to create, link, ignore, ambiguous, or unresolved as appropriate.",
    "For distinct named people, places, factions, technologies, books, chapters, and scenes, prefer link or create. Reserve unresolved for vague mentions that cannot be safely identified.",
    "When you suggest a new record, fill suggestedCreateFields.titleOrName with a concise working title that is more specific than the raw mention when the text supports it.",
    "Favor stable coarse drafts over ultra-fine fragments; a second review pass will polish weak items.",
    "",
    projectTitle ? `Project title: ${projectTitle}` : null,
    projectTitle
      ? "Use the project title as a naming hint only when the chunk is defining the series itself."
      : null,
    "",
    buildInsertionContextSection(input?.projectContext),
    "",
    includeChunkText
      ? "Chunk text:"
      : "Chunk text omitted in this fallback pass; rely on the normalized source sections and insertion context.",
    includeChunkText ? String(input?.chunkText ?? "") : null,
  ].join("\n");
}

function buildMultiTimelineBrainDumpReviewUserPrompt(input) {
  const projectTitle = asString(input?.projectTitle);
  const normalizedSections = Array.isArray(input?.normalizedSections) ? input.normalizedSections : [];
  const includeChunkText = input?.includeChunkText !== false;
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
        suggestedAction: "create|link|ignore|ambiguous|unresolved",
        suggestedCreateFields: {
          titleOrName: "string",
          summary: "string",
          description: "string",
          publicWikiSummary: "string",
        },
        summary: "string",
        description: "string",
        confidence: "low|medium|high|confirmed",
        reason: "string",
      },
    ],
    warnings: ["string"],
  };
  const reviewReasons = Array.isArray(input?.reviewReasons) ? input.reviewReasons : [];
  const surroundingContext = buildInsertionContextSection(input?.projectContext);

  return [
    "Return JSON with this shape:",
    JSON.stringify(schemaExample, null, 2),
    "",
    "Rewrite the draft in place so it is easier to trust during human review.",
    "Keep the beat faithful to the source, but tighten weak wording, generic titles, and noisy entity suggestions.",
    "If the draft is already strong, preserve the beat and only polish it.",
    "If the draft is generic, conflated, or thin, use the source text to make it more concrete and add a warning explaining what remains uncertain.",
    "Do not invent dates or IDs.",
    "Do not infer year values from series premise, genre, or surrounding worldbuilding unless the source chunk explicitly states them.",
    reviewReasons.length ? `Review reasons: ${reviewReasons.join("; ")}` : null,
    projectTitle ? `Project title: ${projectTitle}` : null,
    projectTitle
      ? "Use the project title only as a naming hint when the source is clearly defining the series itself."
      : null,
    "",
    normalizedSections.length > 0 ? "Normalized source sections:" : null,
    normalizedSections.length > 0 ? JSON.stringify(normalizedSections, null, 2) : null,
    "",
    surroundingContext,
    "",
    includeChunkText
      ? "Source chunk text:"
      : "Source chunk text omitted in this fallback pass; rely on the normalized source sections and the original extracted draft.",
    includeChunkText ? String(input?.chunkText ?? "") : null,
    "",
    "Original extracted draft:",
    JSON.stringify(input?.draft ?? {}, null, 2),
  ].join("\n");
}

const BRAIN_DUMP_ENTITY_ACTIONS = Object.freeze([
  "link",
  "create",
  "ignore",
  "ambiguous",
  "unresolved",
]);

function normalizeBrainDumpEntityAction(value) {
  const normalized = String(value ?? "").trim().toLowerCase();

  return BRAIN_DUMP_ENTITY_ACTIONS.includes(normalized) ? normalized : "";
}

function getBrainDumpEntityCreateTitle(entity, fallbackTitle = "") {
  const explicitTitle = asString(entity?.suggestedCreateFields?.titleOrName);

  if (explicitTitle) {
    return explicitTitle;
  }

  const mention = asString(entity?.mention);

  if (mention) {
    return mention;
  }

  return asString(fallbackTitle);
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

function buildReferenceContextSection(referenceContext) {
  if (
    !referenceContext ||
    typeof referenceContext !== "object" ||
    (!Array.isArray(referenceContext.cards) && !Array.isArray(referenceContext.relatedEvents))
  ) {
    return "";
  }

  const lines = ["Session reference context:"];
  const cards = Array.isArray(referenceContext.cards) ? referenceContext.cards : [];
  const relatedEvents = Array.isArray(referenceContext.relatedEvents)
    ? referenceContext.relatedEvents
    : [];

  if (cards.length > 0) {
    lines.push("Earlier cards in this composer:");

    for (const card of cards) {
      if (!card || typeof card !== "object") {
        continue;
      }

      const cardType = String(card.cardType ?? "").trim() === "manual" ? "Manual" : "AI";
      const title = String(card.title ?? "").trim() || "Untitled card";
      const summary = String(card.summary ?? "").trim();
      const status = String(card.status ?? "").trim() || "idle";
      const bookmarkLabel = card.bookmarked ? "bookmarked" : "unbookmarked";

      lines.push(
        `- ${cardType} card ${title} [${status}, ${bookmarkLabel}]${summary ? `: ${summary}` : ""}`
      );
    }
  }

  if (relatedEvents.length > 0) {
    lines.push("Potentially related timeline events discovered from linked entities:");

    for (const event of relatedEvents) {
      if (!event || typeof event !== "object") {
        continue;
      }

      const title = String(event.title ?? "").trim() || "Untitled event";
      const summary = String(event.summary ?? "").trim();
      const relation = String(event.relation ?? "summary");
      const detailLabel = relation === "description" ? "full description already relevant" : "summary only";

      lines.push(`- ${title} (${detailLabel})${summary ? `: ${summary}` : ""}`);

      if (relation === "description") {
        const description = String(event.description ?? "").trim();
        if (description) {
          lines.push(`  Description: ${description}`);
        }
      }
    }
  }

  if (cards.length === 0 && relatedEvents.length === 0) {
    return "";
  }

  lines.push(
    "Use this reference context for continuity only. Do not merge unrelated cards, and do not invent new chronology from these notes."
  );

  return lines.join("\n");
}

function extractFirstJsonObject(rawText) {
  const parsedObjects = extractJsonObjectsFromText(rawText);

  return parsedObjects[0] ?? null;
}

function extractJsonObjectsFromText(rawText) {
  const text = String(rawText ?? "").trim();

  if (!text) {
    return [];
  }

  const directParse = tryParseJsonCandidate(text);

  if (directParse !== null) {
    return [directParse];
  }

  const parsedObjects = [];

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
      parsedObjects.push(parsed);
      index = endIndex;
    }
  }

  return parsedObjects;
}

function normalizeMultiTimelineBrainDumpChunkCandidates(parsedCandidates) {
  const normalizedCandidates = (Array.isArray(parsedCandidates) ? parsedCandidates : [])
    .map((parsed) => normalizeMultiTimelineBrainDumpChunkOutput(parsed))
    .filter((normalized) => normalized.events.length > 0 || normalized.links.length > 0 || normalized.warnings.length > 0);

  if (normalizedCandidates.length === 0) {
    return {
      events: [],
      links: [],
      warnings: [],
    };
  }

  return {
    events: normalizedCandidates.flatMap((normalized) => normalized.events),
    links: normalizedCandidates.flatMap((normalized) => normalized.links),
    warnings: normalizedCandidates.flatMap((normalized) => normalized.warnings),
  };
}

function normalizeMultiTimelineBrainDumpChunkOutput(parsed) {
  const links = Array.isArray(parsed?.crossEventLinks) ? parsed.crossEventLinks : [];
  const warnings = asStringArray(parsed?.warnings);
  const recoveredWarnings = [];
  let rawEvents = [];

  if (Array.isArray(parsed)) {
    rawEvents = parsed;
    recoveredWarnings.push("Recovered chunk events from a top-level JSON array.");
  } else if (Array.isArray(parsed?.events)) {
    rawEvents = parsed.events;
  } else if (hasEventDraftShape(parsed)) {
    rawEvents = [parsed];
    recoveredWarnings.push("Recovered one chunk event from a non-standard single-event JSON object.");
  }

  const events = rawEvents
    .map((entry) => normalizeMultiTimelineEventEntry(entry))
    .filter((entry) => hasEventContent(entry?.event));

  return {
    events,
    links,
    warnings: [...warnings, ...recoveredWarnings],
  };
}

function asStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter(Boolean)
    )
  );
}

function normalizeMultiTimelineEventEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  if (entry.event && typeof entry.event === "object") {
    return {
      ...entry,
      entities: Array.isArray(entry.entities) ? entry.entities : [],
    };
  }

  if (hasEventContent(entry)) {
    return {
      event: entry,
      entities: Array.isArray(entry.entities) ? entry.entities : [],
    };
  }

  return null;
}

function hasEventDraftShape(value) {
  if (!value || typeof value !== "object") {
    return false;
  }

  if (value.event && typeof value.event === "object") {
    return hasEventContent(value.event);
  }

  return hasEventContent(value);
}

function hasEventContent(event) {
  if (!event || typeof event !== "object") {
    return false;
  }

  return String(event?.title ?? "").trim().length > 0;
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

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
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
  buildBrainDumpNormalizationSystemPrompt,
  buildBrainDumpNormalizationUserPrompt,
  buildMultiTimelineBrainDumpSystemPrompt,
  buildMultiTimelineBrainDumpReviewSystemPrompt,
  buildMultiTimelineBrainDumpUserPrompt,
  buildMultiTimelineBrainDumpReviewUserPrompt,
  buildTimelineBrainDumpSystemPrompt,
  buildTimelineBrainDumpUserPrompt,
  buildSummarySystemPrompt,
  buildSummaryUserPrompt,
  extractFirstJsonObject,
  extractJsonObjectsFromText,
  extractOpenAiResponseText,
  getBrainDumpEntityCreateTitle,
  normalizeBrainDumpNormalizationOutput,
  normalizeBrainDumpSectionType,
  normalizeMultiTimelineBrainDumpChunkCandidates,
  normalizeMultiTimelineBrainDumpChunkOutput,
  normalizeBrainDumpEntityAction,
  splitBrainDumpIntoParagraphBlocks,
  splitTextIntoChunks,
};
