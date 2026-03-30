import type { BrainDumpExtractionResult } from "@/types/ai-brain-dump";

export const BRAIN_DUMP_MAX_CHARACTERS = 180000;
export const BRAIN_DUMP_PROMPT_EXCERPT_LIMIT = 1500;
export const BRAIN_DUMP_OPENAI_TIMEOUT_MS = 90000;
export const BRAIN_DUMP_OPENAI_MAX_OUTPUT_TOKENS = 6000;

export type BrainDumpRequestInput = {
  title: string;
  purpose: string;
  guidance: string;
  sourceText: string;
};

export function normalizeBrainDumpRequestInput(
  value: Partial<BrainDumpRequestInput> | null | undefined
): BrainDumpRequestInput {
  return {
    title: typeof value?.title === "string" ? value.title.trim() : "",
    purpose: typeof value?.purpose === "string" ? value.purpose.trim() : "",
    guidance: typeof value?.guidance === "string" ? value.guidance.trim() : "",
    sourceText: typeof value?.sourceText === "string" ? value.sourceText.trim() : "",
  };
}

export function validateBrainDumpRequestInput(value: BrainDumpRequestInput) {
  if (!value.title) {
    throw new Error("Brain dump title is required.");
  }

  if (!value.sourceText) {
    throw new Error("Brain dump text is required.");
  }

  if (value.sourceText.length > BRAIN_DUMP_MAX_CHARACTERS) {
    throw new Error(
      `Brain dump text must stay under ${BRAIN_DUMP_MAX_CHARACTERS.toLocaleString()} characters.`
    );
  }
}

export function buildBrainDumpModelInput({
  projectTitle,
  purpose,
  guidance,
  sourceText,
}: {
  projectTitle: string;
  purpose: string;
  guidance: string;
  sourceText: string;
}) {
  return [
    `Project title: ${projectTitle}`,
    `Requested outcome: ${purpose || "Split the dump into reviewable planning proposals."}`,
    `Author guidance: ${guidance || "Focus on clean extraction, conservative inference, and note ambiguity instead of inventing canon."}`,
    "Return JSON only.",
    "Brain dump:",
    sourceText,
  ].join("\n\n");
}

export function buildBrainDumpOutputSummary(result: BrainDumpExtractionResult) {
  return [
    summarizeCount(result.timelineEvents.length, "timeline event"),
    summarizeCount(result.characters.length, "character"),
    summarizeCount(result.chapterOutlines.length, "chapter outline"),
    summarizeCount(result.scenes.length, "scene"),
  ].join(", ");
}

export function deriveLinkedEntityTypesFromBrainDump(result: BrainDumpExtractionResult) {
  const linkedTypes: string[] = [];

  if (result.timelineEvents.length > 0) {
    linkedTypes.push("timeline_events");
  }

  if (result.characters.length > 0) {
    linkedTypes.push("characters");
  }

  if (result.chapterOutlines.length > 0) {
    linkedTypes.push("chapters");
  }

  if (result.scenes.length > 0) {
    linkedTypes.push("scenes");
  }

  return linkedTypes;
}

export function deriveLinkedEntityIdsFromBrainDump(result: BrainDumpExtractionResult) {
  const linkedIds = new Set<string>();

  for (const proposal of result.characters) {
    if (proposal.review.matchedRecord?.recordId) {
      linkedIds.add(proposal.review.matchedRecord.recordId);
    }
  }

  for (const proposal of result.timelineEvents) {
    if (proposal.review.matchedRecord?.recordId) {
      linkedIds.add(proposal.review.matchedRecord.recordId);
    }
  }

  for (const proposal of result.chapterOutlines) {
    if (proposal.review.matchedRecord?.recordId) {
      linkedIds.add(proposal.review.matchedRecord.recordId);
    }
  }

  for (const proposal of result.scenes) {
    if (proposal.review.matchedRecord?.recordId) {
      linkedIds.add(proposal.review.matchedRecord.recordId);
    }
  }

  return [...linkedIds];
}

export function buildPromptExcerpt(sourceText: string) {
  if (sourceText.length <= BRAIN_DUMP_PROMPT_EXCERPT_LIMIT) {
    return sourceText;
  }

  return `${sourceText.slice(0, BRAIN_DUMP_PROMPT_EXCERPT_LIMIT).trimEnd()}...`;
}

function summarizeCount(count: number, singularLabel: string) {
  const suffix = count === 1 ? singularLabel : `${singularLabel}s`;
  return `${count} ${suffix}`;
}
