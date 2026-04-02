import mammoth from "mammoth";

import { BRAIN_DUMP_OPENAI_TIMEOUT_MS } from "@/lib/ai/brain-dump";
import {
  ATTACHMENT_DOCUMENT_ALLOWED_MIME_TYPES,
  ATTACHMENT_DOCUMENT_MAX_FILE_SIZE_BYTES,
} from "@/lib/data/attachment-storage";
import { slugifyAiSessionTitle } from "@/types/ai-session";

export const MANUSCRIPT_IMPORT_MAX_FILES = 10;
export const MANUSCRIPT_IMPORT_MAX_CHUNK_CHARACTERS = 30000;
export const MANUSCRIPT_IMPORT_CHUNK_OVERLAP_CHARACTERS = 1500;
export const MANUSCRIPT_IMPORT_OPENAI_TIMEOUT_MS = BRAIN_DUMP_OPENAI_TIMEOUT_MS;
export const MANUSCRIPT_IMPORT_OPENAI_MAX_OUTPUT_TOKENS = 7000;

export type ManuscriptImportCreateInput = {
  title: string;
  purpose: string;
  guidance: string;
  importMode: "single_book" | "series";
};

export type ManuscriptChunkPlan = {
  chunkId: string;
  index: number;
  startOffset: number;
  endOffset: number;
  heading: string;
  excerpt: string;
  chapterTitle: string;
  chapterIndex: number;
  chapterChunkIndex: number;
  chapterChunkCount: number;
};

type ManuscriptLineInfo = {
  text: string;
  startOffset: number;
  endOffset: number;
};

type ManuscriptChapterPlan = {
  chapterTitle: string;
  chapterIndex: number;
  startOffset: number;
  endOffset: number;
};

export type ManuscriptChunkExtractionResult = {
  summary: string;
  continuityWarnings: string[];
  characters: Array<{
    name: string;
    summary: string;
    characterType: string;
    importanceLevel: string;
    traits: string[];
    motivations: string[];
    relatedSceneTitles: string[];
    evidence: string;
    confidence: "low" | "medium" | "high";
  }>;
  locations: Array<{
    name: string;
    summary: string;
    locationType: string;
    notableFeatures: string[];
    linkedSceneTitles: string[];
    evidence: string;
    confidence: "low" | "medium" | "high";
  }>;
  plotThreads: Array<{
    title: string;
    summary: string;
    threadType: string;
    setupNotes: string[];
    payoffNotes: string[];
    linkedCharacterNames: string[];
    linkedChapterTitles: string[];
    linkedSceneTitles: string[];
    evidence: string;
    confidence: "low" | "medium" | "high";
  }>;
  timelineEvents: Array<{
    title: string;
    summary: string;
    eventType: string;
    dateLabel: string;
    linkedCharacterNames: string[];
    linkedLocationNames: string[];
    linkedChapterTitles: string[];
    linkedSceneTitles: string[];
    evidence: string;
    confidence: "low" | "medium" | "high";
  }>;
  chapters: Array<{
    title: string;
    summary: string;
    purpose: string;
    pointOfViewCharacterName: string;
    estimatedChapterNumber: string;
    sceneTitles: string[];
    evidence: string;
    confidence: "low" | "medium" | "high";
  }>;
  scenes: Array<{
    title: string;
    summary: string;
    sceneType: string;
    pointOfViewCharacterName: string;
    goal: string;
    conflict: string;
    outcome: string;
    linkedTimelineEventTitles: string[];
    evidence: string;
    confidence: "low" | "medium" | "high";
  }>;
  unresolvedQuestions: string[];
  suggestedNextActions: string[];
};

export const MANUSCRIPT_IMPORT_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "continuityWarnings",
    "characters",
    "locations",
    "plotThreads",
    "timelineEvents",
    "chapters",
    "scenes",
    "unresolvedQuestions",
    "suggestedNextActions",
  ],
  properties: {
    summary: { type: "string" },
    continuityWarnings: stringArraySchema(),
    characters: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "name",
          "summary",
          "characterType",
          "importanceLevel",
          "traits",
          "motivations",
          "relatedSceneTitles",
          "evidence",
          "confidence",
        ],
        properties: {
          name: { type: "string" },
          summary: { type: "string" },
          characterType: { type: "string" },
          importanceLevel: { type: "string" },
          traits: stringArraySchema(),
          motivations: stringArraySchema(),
          relatedSceneTitles: stringArraySchema(),
          evidence: { type: "string" },
          confidence: confidenceEnumSchema(),
        },
      },
    },
    locations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "name",
          "summary",
          "locationType",
          "notableFeatures",
          "linkedSceneTitles",
          "evidence",
          "confidence",
        ],
        properties: {
          name: { type: "string" },
          summary: { type: "string" },
          locationType: { type: "string" },
          notableFeatures: stringArraySchema(),
          linkedSceneTitles: stringArraySchema(),
          evidence: { type: "string" },
          confidence: confidenceEnumSchema(),
        },
      },
    },
    plotThreads: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "title",
          "summary",
          "threadType",
          "setupNotes",
          "payoffNotes",
          "linkedCharacterNames",
          "linkedChapterTitles",
          "linkedSceneTitles",
          "evidence",
          "confidence",
        ],
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          threadType: { type: "string" },
          setupNotes: stringArraySchema(),
          payoffNotes: stringArraySchema(),
          linkedCharacterNames: stringArraySchema(),
          linkedChapterTitles: stringArraySchema(),
          linkedSceneTitles: stringArraySchema(),
          evidence: { type: "string" },
          confidence: confidenceEnumSchema(),
        },
      },
    },
    timelineEvents: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "title",
          "summary",
          "eventType",
          "dateLabel",
          "linkedCharacterNames",
          "linkedLocationNames",
          "linkedChapterTitles",
          "linkedSceneTitles",
          "evidence",
          "confidence",
        ],
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          eventType: { type: "string" },
          dateLabel: { type: "string" },
          linkedCharacterNames: stringArraySchema(),
          linkedLocationNames: stringArraySchema(),
          linkedChapterTitles: stringArraySchema(),
          linkedSceneTitles: stringArraySchema(),
          evidence: { type: "string" },
          confidence: confidenceEnumSchema(),
        },
      },
    },
    chapters: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "title",
          "summary",
          "purpose",
          "pointOfViewCharacterName",
          "estimatedChapterNumber",
          "sceneTitles",
          "evidence",
          "confidence",
        ],
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          purpose: { type: "string" },
          pointOfViewCharacterName: { type: "string" },
          estimatedChapterNumber: { type: "string" },
          sceneTitles: stringArraySchema(),
          evidence: { type: "string" },
          confidence: confidenceEnumSchema(),
        },
      },
    },
    scenes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "title",
          "summary",
          "sceneType",
          "pointOfViewCharacterName",
          "goal",
          "conflict",
          "outcome",
          "linkedTimelineEventTitles",
          "evidence",
          "confidence",
        ],
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          sceneType: { type: "string" },
          pointOfViewCharacterName: { type: "string" },
          goal: { type: "string" },
          conflict: { type: "string" },
          outcome: { type: "string" },
          linkedTimelineEventTitles: stringArraySchema(),
          evidence: { type: "string" },
          confidence: confidenceEnumSchema(),
        },
      },
    },
    unresolvedQuestions: stringArraySchema(),
    suggestedNextActions: stringArraySchema(),
  },
} as const;

export function normalizeManuscriptImportCreateInput(
  value: Partial<ManuscriptImportCreateInput> | null | undefined
): ManuscriptImportCreateInput {
  return {
    title: typeof value?.title === "string" ? value.title.trim() : "",
    purpose: typeof value?.purpose === "string" ? value.purpose.trim() : "",
    guidance: typeof value?.guidance === "string" ? value.guidance.trim() : "",
    importMode: value?.importMode === "series" ? "series" : "single_book",
  };
}

export function validateManuscriptImportCreateInput(value: ManuscriptImportCreateInput) {
  if (!value.title) {
    throw new Error("Import session title is required.");
  }
}

export function validateManuscriptImportFiles(files: File[]) {
  if (files.length === 0) {
    throw new Error("Select at least one manuscript file.");
  }

  if (files.length > MANUSCRIPT_IMPORT_MAX_FILES) {
    throw new Error(`You can upload at most ${MANUSCRIPT_IMPORT_MAX_FILES} files at a time.`);
  }

  for (const file of files) {
    if (
      !ATTACHMENT_DOCUMENT_ALLOWED_MIME_TYPES.includes(
        file.type as (typeof ATTACHMENT_DOCUMENT_ALLOWED_MIME_TYPES)[number]
      )
    ) {
      throw new Error("Only TXT and DOCX manuscript files are supported.");
    }

    if (file.size > ATTACHMENT_DOCUMENT_MAX_FILE_SIZE_BYTES) {
      throw new Error("Each manuscript file must be 25 MB or smaller.");
    }
  }
}

export async function parseManuscriptTextFromBuffer({
  arrayBuffer,
  mimeType,
  fileName,
}: {
  arrayBuffer: ArrayBuffer;
  mimeType: string;
  fileName: string;
}) {
  if (mimeType === "text/plain" || fileName.toLowerCase().endsWith(".txt")) {
    return normalizeParsedText(new TextDecoder("utf-8", { fatal: false }).decode(arrayBuffer));
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileName.toLowerCase().endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({
      buffer: Buffer.from(arrayBuffer),
    });

    return normalizeParsedText(result.value);
  }

  throw new Error("Only TXT and DOCX manuscript files are supported.");
}

export function buildChunkPlan(text: string, prefix: string): ManuscriptChunkPlan[] {
  const normalized = normalizeParsedText(text);

  if (!normalized) {
    return [];
  }

  const chapters = detectChapterPlans(normalized);

  if (chapters.length > 0) {
    return buildChapterFirstChunkPlan(normalized, prefix, chapters);
  }

  return buildFallbackChunkPlan(normalized, prefix);
}

function buildChapterFirstChunkPlan(
  text: string,
  prefix: string,
  chapters: ManuscriptChapterPlan[]
) {
  const chunks: ManuscriptChunkPlan[] = [];
  let globalChunkIndex = 0;

  for (const chapter of chapters) {
    const chapterChunks = buildChunkPlansForSegment({
      text,
      prefix,
      chapterTitle: chapter.chapterTitle,
      chapterIndex: chapter.chapterIndex,
      segmentStartOffset: chapter.startOffset,
      segmentEndOffset: chapter.endOffset,
      globalChunkStartIndex: globalChunkIndex,
    });

    chunks.push(...chapterChunks);
    globalChunkIndex += chapterChunks.length;
  }

  return chunks;
}

function buildFallbackChunkPlan(text: string, prefix: string) {
  const fallbackTitle = deriveChunkHeading(text) || "Imported manuscript";

  return buildChunkPlansForSegment({
    text,
    prefix,
    chapterTitle: fallbackTitle,
    chapterIndex: 1,
    segmentStartOffset: 0,
    segmentEndOffset: text.length,
    globalChunkStartIndex: 0,
  });
}

function buildChunkPlansForSegment({
  text,
  prefix,
  chapterTitle,
  chapterIndex,
  segmentStartOffset,
  segmentEndOffset,
  globalChunkStartIndex,
}: {
  text: string;
  prefix: string;
  chapterTitle: string;
  chapterIndex: number;
  segmentStartOffset: number;
  segmentEndOffset: number;
  globalChunkStartIndex: number;
}) {
  const chunks: ManuscriptChunkPlan[] = [];
  let startOffset = segmentStartOffset;

  while (startOffset < segmentEndOffset) {
    const hardEnd = Math.min(
      segmentEndOffset,
      startOffset + MANUSCRIPT_IMPORT_MAX_CHUNK_CHARACTERS
    );
    let endOffset = hardEnd;

    if (hardEnd < segmentEndOffset) {
      endOffset =
        findPreferredBoundary(text, startOffset, hardEnd) ??
        findParagraphBoundary(text, startOffset, hardEnd) ??
        hardEnd;
    }

    const chunkText = text.slice(startOffset, endOffset).trim();

    if (!chunkText) {
      break;
    }

    chunks.push({
      chunkId: "",
      index: globalChunkStartIndex + chunks.length,
      startOffset,
      endOffset,
      heading: "",
      excerpt: chunkText.slice(0, 220),
      chapterTitle,
      chapterIndex,
      chapterChunkIndex: 0,
      chapterChunkCount: 0,
    });

    if (endOffset >= segmentEndOffset) {
      break;
    }

    startOffset = getNextChunkStartOffset(startOffset, endOffset, segmentStartOffset);
  }

  return chunks.map((chunk, index) => {
    const chapterChunkIndex = index + 1;
    const chapterChunkCount = chunks.length;

    return {
      ...chunk,
      chunkId: `${prefix}_chunk_${chunk.index + 1}`,
      heading:
        chapterChunkCount > 1
          ? `${chapterTitle} (Part ${chapterChunkIndex})`
          : chapterTitle,
      chapterChunkIndex,
      chapterChunkCount,
    };
  });
}

export function sliceChunkText(text: string, chunk: Pick<ManuscriptChunkPlan, "startOffset" | "endOffset">) {
  return text.slice(chunk.startOffset, chunk.endOffset).trim();
}

export function buildManuscriptImportModelInput({
  projectTitle,
  bookTitle,
  purpose,
  guidance,
  chunkHeading,
  sourceText,
}: {
  projectTitle: string;
  bookTitle: string;
  purpose: string;
  guidance: string;
  chunkHeading?: string;
  sourceText: string;
}) {
  return [
    `Project title: ${projectTitle}`,
    `Imported book title: ${bookTitle}`,
    `Requested outcome: ${
      purpose ||
      "Extract reviewable manuscript-import proposals for characters, locations, plot threads, timeline events, chapters, and scenes."
    }`,
    `Author guidance: ${
      guidance ||
      "Be conservative, avoid inventing canon, and prefer clean extraction with explicit ambiguity."
    }`,
    `Chunk heading: ${chunkHeading || "Unknown chunk"}`,
    "Return JSON only.",
    "Imported manuscript chunk:",
    sourceText,
  ].join("\n\n");
}

export function buildImportBookId(fileName: string, index: number) {
  const base = slugifyAiSessionTitle(fileName.replace(/\.[^/.]+$/, "")).replace(/-/g, "_");
  return `import_book_${base || "book"}_${index + 1}`;
}

export function normalizeManuscriptChunkExtractionResult(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  return {
    summary: readString(value.summary),
    continuityWarnings: readStringArray(value.continuityWarnings),
    characters: readObjectArray(value.characters).map((item) => ({
      name: readString(item.name),
      summary: readString(item.summary),
      characterType: readString(item.characterType),
      importanceLevel: readString(item.importanceLevel),
      traits: readStringArray(item.traits),
      motivations: readStringArray(item.motivations),
      relatedSceneTitles: readStringArray(item.relatedSceneTitles),
      evidence: readString(item.evidence),
      confidence: coerceConfidence(item.confidence),
    })),
    locations: readObjectArray(value.locations).map((item) => ({
      name: readString(item.name),
      summary: readString(item.summary),
      locationType: readString(item.locationType),
      notableFeatures: readStringArray(item.notableFeatures),
      linkedSceneTitles: readStringArray(item.linkedSceneTitles),
      evidence: readString(item.evidence),
      confidence: coerceConfidence(item.confidence),
    })),
    plotThreads: readObjectArray(value.plotThreads).map((item) => ({
      title: readString(item.title),
      summary: readString(item.summary),
      threadType: readString(item.threadType),
      setupNotes: readStringArray(item.setupNotes),
      payoffNotes: readStringArray(item.payoffNotes),
      linkedCharacterNames: readStringArray(item.linkedCharacterNames),
      linkedChapterTitles: readStringArray(item.linkedChapterTitles),
      linkedSceneTitles: readStringArray(item.linkedSceneTitles),
      evidence: readString(item.evidence),
      confidence: coerceConfidence(item.confidence),
    })),
    timelineEvents: readObjectArray(value.timelineEvents).map((item) => ({
      title: readString(item.title),
      summary: readString(item.summary),
      eventType: readString(item.eventType),
      dateLabel: readString(item.dateLabel),
      linkedCharacterNames: readStringArray(item.linkedCharacterNames),
      linkedLocationNames: readStringArray(item.linkedLocationNames),
      linkedChapterTitles: readStringArray(item.linkedChapterTitles),
      linkedSceneTitles: readStringArray(item.linkedSceneTitles),
      evidence: readString(item.evidence),
      confidence: coerceConfidence(item.confidence),
    })),
    chapters: readObjectArray(value.chapters).map((item) => ({
      title: readString(item.title),
      summary: readString(item.summary),
      purpose: readString(item.purpose),
      pointOfViewCharacterName: readString(item.pointOfViewCharacterName),
      estimatedChapterNumber: readString(item.estimatedChapterNumber),
      sceneTitles: readStringArray(item.sceneTitles),
      evidence: readString(item.evidence),
      confidence: coerceConfidence(item.confidence),
    })),
    scenes: readObjectArray(value.scenes).map((item) => ({
      title: readString(item.title),
      summary: readString(item.summary),
      sceneType: readString(item.sceneType),
      pointOfViewCharacterName: readString(item.pointOfViewCharacterName),
      goal: readString(item.goal),
      conflict: readString(item.conflict),
      outcome: readString(item.outcome),
      linkedTimelineEventTitles: readStringArray(item.linkedTimelineEventTitles),
      evidence: readString(item.evidence),
      confidence: coerceConfidence(item.confidence),
    })),
    unresolvedQuestions: readStringArray(value.unresolvedQuestions),
    suggestedNextActions: readStringArray(value.suggestedNextActions),
  } satisfies ManuscriptChunkExtractionResult;
}

function normalizeParsedText(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/\uFEFF/g, "").trim();
}

function detectChapterPlans(text: string) {
  const lines = splitLinesWithOffsets(text);
  const headingIndexes: number[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (isChapterHeadingLine(lines, index)) {
      headingIndexes.push(index);
    }
  }

  if (headingIndexes.length === 0) {
    return [];
  }

  const chapters: ManuscriptChapterPlan[] = [];

  if ((lines[headingIndexes[0]]?.startOffset ?? 0) > 0) {
    chapters.push({
      chapterTitle: deriveChunkHeading(text.slice(0, lines[headingIndexes[0]]?.startOffset ?? 0)) || "Opening material",
      chapterIndex: 1,
      startOffset: 0,
      endOffset: lines[headingIndexes[0]]?.startOffset ?? text.length,
    });
  }

  for (let index = 0; index < headingIndexes.length; index += 1) {
    const lineIndex = headingIndexes[index];
    const startOffset = lines[lineIndex]?.startOffset ?? 0;
    const nextStartOffset =
      headingIndexes[index + 1] !== undefined
        ? (lines[headingIndexes[index + 1]]?.startOffset ?? text.length)
        : text.length;

    chapters.push({
      chapterTitle: readChapterTitle(lines, lineIndex),
      chapterIndex: chapters.length + 1,
      startOffset,
      endOffset: nextStartOffset,
    });
  }

  return chapters;
}

function splitLinesWithOffsets(text: string) {
  const lines: ManuscriptLineInfo[] = [];
  let startOffset = 0;

  for (const lineText of text.split("\n")) {
    const endOffset = startOffset + lineText.length;

    lines.push({
      text: lineText,
      startOffset,
      endOffset,
    });

    startOffset = endOffset + 1;
  }

  return lines;
}

function isChapterHeadingLine(lines: ManuscriptLineInfo[], index: number) {
  const currentLine = lines[index]?.text.trim() ?? "";

  if (!currentLine || currentLine.length > 120) {
    return false;
  }

  const previousLine = lines[index - 1]?.text.trim() ?? "";
  const nextNonEmptyLine = findNextNonEmptyLine(lines, index + 1);

  if (index > 0 && previousLine) {
    return false;
  }

  if (!nextNonEmptyLine) {
    return false;
  }

  return (
    /^chapter\b[^\n]{0,100}$/i.test(currentLine) ||
    /^(prologue|epilogue|interlude|preface|foreword|afterword)\b[^\n]{0,100}$/i.test(
      currentLine
    )
  );
}

function readChapterTitle(lines: ManuscriptLineInfo[], index: number) {
  const currentLine = lines[index]?.text.trim() ?? "";
  const nextLine = lines[index + 1]?.text.trim() ?? "";
  const thirdLine = lines[index + 2]?.text.trim() ?? "";

  if (
    nextLine &&
    nextLine.length <= 80 &&
    !isChapterHeadingLine(lines, index + 1) &&
    !thirdLine
  ) {
    return `${currentLine}: ${nextLine}`;
  }

  return currentLine;
}

function findNextNonEmptyLine(lines: ManuscriptLineInfo[], startIndex: number) {
  for (let index = startIndex; index < lines.length; index += 1) {
    const nextLine = lines[index];

    if (nextLine?.text.trim()) {
      return nextLine;
    }
  }

  return null;
}

function findPreferredBoundary(text: string, startOffset: number, hardEnd: number) {
  const windowText = text.slice(startOffset, hardEnd);
  const headingMatch = [...windowText.matchAll(/\n{2,}(chapter[^\n]{0,80}|scene[^\n]{0,80})\n/gi)].pop();

  if (!headingMatch || typeof headingMatch.index !== "number") {
    return null;
  }

  return startOffset + headingMatch.index + 2;
}

function findParagraphBoundary(text: string, startOffset: number, hardEnd: number) {
  const windowText = text.slice(startOffset, hardEnd);
  const paragraphBreak = windowText.lastIndexOf("\n\n");
  return paragraphBreak > 0 ? startOffset + paragraphBreak + 2 : null;
}

function deriveChunkHeading(chunkText: string) {
  const firstLine = chunkText.split("\n")[0]?.trim() ?? "";
  return firstLine.slice(0, 120);
}

function getNextChunkStartOffset(
  currentStartOffset: number,
  endOffset: number,
  segmentStartOffset: number
) {
  const overlappedStartOffset = Math.max(
    segmentStartOffset,
    endOffset - MANUSCRIPT_IMPORT_CHUNK_OVERLAP_CHARACTERS
  );

  return overlappedStartOffset > currentStartOffset ? overlappedStartOffset : endOffset;
}

function stringArraySchema() {
  return {
    type: "array",
    items: { type: "string" },
  } as const;
}

function confidenceEnumSchema() {
  return {
    type: "string",
    enum: ["low", "medium", "high"],
  } as const;
}

function coerceConfidence(value: unknown): "low" | "medium" | "high" {
  return value === "low" || value === "medium" || value === "high" ? value : "medium";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readObjectArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is Record<string, unknown> => isRecord(item));
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}
