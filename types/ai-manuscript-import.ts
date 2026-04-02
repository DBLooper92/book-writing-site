import type {
  BrainDumpProposalConfidence,
  BrainDumpProposalMatchCandidate,
  BrainDumpProposalReview,
  BrainDumpTimelinePlacementSuggestion,
} from "@/types/ai-brain-dump";
import type { Json } from "@/types/database";

export const MANUSCRIPT_IMPORT_STAGE_VALUES = [
  "upload",
  "mapping",
  "ready_to_process",
  "processing",
  "review",
  "failed",
] as const;
export const MANUSCRIPT_IMPORT_MODE_VALUES = ["single_book", "series"] as const;
export const MANUSCRIPT_IMPORT_PARSE_STATUS_VALUES = [
  "pending",
  "parsed",
  "failed",
] as const;
export const MANUSCRIPT_IMPORT_BOOK_STATUS_VALUES = [
  "pending_mapping",
  "ready_to_process",
  "processing",
  "ready_for_review",
  "failed",
] as const;
export const MANUSCRIPT_IMPORT_MAPPING_STATUS_VALUES = ["pending", "saved"] as const;
export const MANUSCRIPT_IMPORT_CHUNK_STATUS_VALUES = [
  "pending",
  "processed",
  "failed",
] as const;

export type ManuscriptImportStage = (typeof MANUSCRIPT_IMPORT_STAGE_VALUES)[number];
export type ManuscriptImportMode = (typeof MANUSCRIPT_IMPORT_MODE_VALUES)[number];
export type ManuscriptImportParseStatus =
  (typeof MANUSCRIPT_IMPORT_PARSE_STATUS_VALUES)[number];
export type ManuscriptImportBookStatus =
  (typeof MANUSCRIPT_IMPORT_BOOK_STATUS_VALUES)[number];
export type ManuscriptImportMappingStatus =
  (typeof MANUSCRIPT_IMPORT_MAPPING_STATUS_VALUES)[number];
export type ManuscriptImportChunkStatus =
  (typeof MANUSCRIPT_IMPORT_CHUNK_STATUS_VALUES)[number];

export type ManuscriptImportChunk = {
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
  status: ManuscriptImportChunkStatus;
  error: string;
};

export type ManuscriptImportBookMapping = {
  mappingStatus: ManuscriptImportMappingStatus;
  suggestedAction: "create" | "update";
  targetBookId: string | null;
  targetBookTitle: string;
  matchedRecord: BrainDumpProposalMatchCandidate | null;
  matchCandidates: BrainDumpProposalMatchCandidate[];
};

export type ManuscriptImportFile = {
  attachmentId: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  parseStatus: ManuscriptImportParseStatus;
  parseError: string;
  plainTextLength: number;
  importBookId: string;
};

export type ManuscriptImportBook = {
  importBookId: string;
  attachmentId: string;
  fileName: string;
  title: string;
  status: ManuscriptImportBookStatus;
  parseStatus: ManuscriptImportParseStatus;
  parseError: string;
  plainTextLength: number;
  processedChunkCount: number;
  chunkCount: number;
  lastError: string;
  mapping: ManuscriptImportBookMapping;
  chunks: ManuscriptImportChunk[];
};

export type ManuscriptImportProposalBase = {
  proposalId: string;
  sourceBookIds: string[];
  sourceAttachmentIds: string[];
  sourceChunkIds: string[];
  evidence: string;
  confidence: BrainDumpProposalConfidence;
  review: BrainDumpProposalReview;
};

export type ManuscriptImportCharacterProposal = ManuscriptImportProposalBase & {
  name: string;
  summary: string;
  characterType: string;
  importanceLevel: string;
  traits: string[];
  motivations: string[];
  relatedSceneTitles: string[];
};

export type ManuscriptImportLocationProposal = ManuscriptImportProposalBase & {
  name: string;
  summary: string;
  locationType: string;
  notableFeatures: string[];
  linkedSceneTitles: string[];
};

export type ManuscriptImportPlotThreadProposal = ManuscriptImportProposalBase & {
  title: string;
  summary: string;
  threadType: string;
  setupNotes: string[];
  payoffNotes: string[];
  linkedCharacterNames: string[];
  linkedChapterTitles: string[];
  linkedSceneTitles: string[];
};

export type ManuscriptImportTimelineEventProposal = ManuscriptImportProposalBase & {
  title: string;
  summary: string;
  eventType: string;
  dateLabel: string;
  linkedCharacterNames: string[];
  linkedLocationNames: string[];
  linkedChapterTitles: string[];
  linkedSceneTitles: string[];
  placementSuggestion: BrainDumpTimelinePlacementSuggestion;
};

export type ManuscriptImportChapterProposal = ManuscriptImportProposalBase & {
  title: string;
  summary: string;
  purpose: string;
  pointOfViewCharacterName: string;
  estimatedChapterNumber: string;
  sceneTitles: string[];
  targetBookId: string | null;
};

export type ManuscriptImportSceneProposal = ManuscriptImportProposalBase & {
  title: string;
  summary: string;
  sceneType: string;
  pointOfViewCharacterName: string;
  goal: string;
  conflict: string;
  outcome: string;
  linkedTimelineEventTitles: string[];
  targetBookId: string | null;
};

export type ManuscriptImportProposalBundle = {
  characters: ManuscriptImportCharacterProposal[];
  locations: ManuscriptImportLocationProposal[];
  plotThreads: ManuscriptImportPlotThreadProposal[];
  timelineEvents: ManuscriptImportTimelineEventProposal[];
  chapters: ManuscriptImportChapterProposal[];
  scenes: ManuscriptImportSceneProposal[];
};

export type ManuscriptImportProposalType = keyof ManuscriptImportProposalBundle;
export type ManuscriptImportProposalByType<
  Type extends ManuscriptImportProposalType,
> = ManuscriptImportProposalBundle[Type][number];
export type ManuscriptImportAnyProposal =
  ManuscriptImportProposalBundle[ManuscriptImportProposalType][number];

export type ManuscriptImportWorkflowState = {
  stage: ManuscriptImportStage;
  importMode: ManuscriptImportMode;
  summary: string;
  continuityWarnings: string[];
  unresolvedQuestions: string[];
  suggestedNextActions: string[];
  lastError: string;
  files: ManuscriptImportFile[];
  books: ManuscriptImportBook[];
  proposals: ManuscriptImportProposalBundle;
};

export function createEmptyManuscriptImportWorkflowState(
  importMode: ManuscriptImportMode = "single_book"
): ManuscriptImportWorkflowState {
  return {
    stage: "upload",
    importMode,
    summary: "",
    continuityWarnings: [],
    unresolvedQuestions: [],
    suggestedNextActions: [],
    lastError: "",
    files: [],
    books: [],
    proposals: {
      characters: [],
      locations: [],
      plotThreads: [],
      timelineEvents: [],
      chapters: [],
      scenes: [],
    },
  };
}

export function normalizeManuscriptImportWorkflowState(value: Json | null | undefined) {
  if (!isRecord(value)) {
    return null;
  }

  return {
    stage: coerceStage(value.stage),
    importMode: coerceImportMode(value.importMode),
    summary: readString(value.summary),
    continuityWarnings: readStringArray(value.continuityWarnings),
    unresolvedQuestions: readStringArray(value.unresolvedQuestions),
    suggestedNextActions: readStringArray(value.suggestedNextActions),
    lastError: readString(value.lastError),
    files: readObjectArray(value.files).map((item) => ({
      attachmentId: readString(item.attachmentId),
      fileName: readString(item.fileName),
      mimeType: readString(item.mimeType),
      fileSizeBytes: readIntegerOrZero(item.fileSizeBytes),
      parseStatus: coerceParseStatus(item.parseStatus),
      parseError: readString(item.parseError),
      plainTextLength: readIntegerOrZero(item.plainTextLength),
      importBookId: readString(item.importBookId),
    })),
    books: readObjectArray(value.books).map((item) => ({
      importBookId: readString(item.importBookId),
      attachmentId: readString(item.attachmentId),
      fileName: readString(item.fileName),
      title: readString(item.title),
      status: coerceBookStatus(item.status),
      parseStatus: coerceParseStatus(item.parseStatus),
      parseError: readString(item.parseError),
      plainTextLength: readIntegerOrZero(item.plainTextLength),
      processedChunkCount: readIntegerOrZero(item.processedChunkCount),
      chunkCount: readIntegerOrZero(item.chunkCount),
      lastError: readString(item.lastError),
      mapping: normalizeBookMapping(item.mapping),
      chunks: readObjectArray(item.chunks).map((chunk) => ({
        chunkId: readString(chunk.chunkId),
        index: readInteger(chunk.index),
        startOffset: readIntegerOrZero(chunk.startOffset),
        endOffset: readIntegerOrZero(chunk.endOffset),
        heading: readString(chunk.heading),
        excerpt: readString(chunk.excerpt),
        chapterTitle: readString(chunk.chapterTitle),
        chapterIndex: readPositiveInteger(chunk.chapterIndex),
        chapterChunkIndex: readPositiveInteger(chunk.chapterChunkIndex),
        chapterChunkCount: readPositiveInteger(chunk.chapterChunkCount),
        status: coerceChunkStatus(chunk.status),
        error: readString(chunk.error),
      })),
    })),
    proposals: normalizeProposalBundle(value.proposals),
  } satisfies ManuscriptImportWorkflowState;
}

function normalizeProposalBundle(value: Json | undefined): ManuscriptImportProposalBundle {
  if (!isRecord(value)) {
    return createEmptyManuscriptImportWorkflowState().proposals;
  }

  return {
    characters: readObjectArray(value.characters).map((item) => ({
      ...normalizeProposalBase(item),
      name: readString(item.name),
      summary: readString(item.summary),
      characterType: readString(item.characterType),
      importanceLevel: readString(item.importanceLevel),
      traits: readStringArray(item.traits),
      motivations: readStringArray(item.motivations),
      relatedSceneTitles: readStringArray(item.relatedSceneTitles),
    })),
    locations: readObjectArray(value.locations).map((item) => ({
      ...normalizeProposalBase(item),
      name: readString(item.name),
      summary: readString(item.summary),
      locationType: readString(item.locationType),
      notableFeatures: readStringArray(item.notableFeatures),
      linkedSceneTitles: readStringArray(item.linkedSceneTitles),
    })),
    plotThreads: readObjectArray(value.plotThreads).map((item) => ({
      ...normalizeProposalBase(item),
      title: readString(item.title),
      summary: readString(item.summary),
      threadType: readString(item.threadType),
      setupNotes: readStringArray(item.setupNotes),
      payoffNotes: readStringArray(item.payoffNotes),
      linkedCharacterNames: readStringArray(item.linkedCharacterNames),
      linkedChapterTitles: readStringArray(item.linkedChapterTitles),
      linkedSceneTitles: readStringArray(item.linkedSceneTitles),
    })),
    timelineEvents: readObjectArray(value.timelineEvents).map((item) => ({
      ...normalizeProposalBase(item),
      title: readString(item.title),
      summary: readString(item.summary),
      eventType: readString(item.eventType),
      dateLabel: readString(item.dateLabel),
      linkedCharacterNames: readStringArray(item.linkedCharacterNames),
      linkedLocationNames: readStringArray(item.linkedLocationNames),
      linkedChapterTitles: readStringArray(item.linkedChapterTitles),
      linkedSceneTitles: readStringArray(item.linkedSceneTitles),
      placementSuggestion: normalizePlacementSuggestion(item.placementSuggestion),
    })),
    chapters: readObjectArray(value.chapters).map((item) => ({
      ...normalizeProposalBase(item),
      title: readString(item.title),
      summary: readString(item.summary),
      purpose: readString(item.purpose),
      pointOfViewCharacterName: readString(item.pointOfViewCharacterName),
      estimatedChapterNumber: readString(item.estimatedChapterNumber),
      sceneTitles: readStringArray(item.sceneTitles),
      targetBookId: readNullableString(item.targetBookId),
    })),
    scenes: readObjectArray(value.scenes).map((item) => ({
      ...normalizeProposalBase(item),
      title: readString(item.title),
      summary: readString(item.summary),
      sceneType: readString(item.sceneType),
      pointOfViewCharacterName: readString(item.pointOfViewCharacterName),
      goal: readString(item.goal),
      conflict: readString(item.conflict),
      outcome: readString(item.outcome),
      linkedTimelineEventTitles: readStringArray(item.linkedTimelineEventTitles),
      targetBookId: readNullableString(item.targetBookId),
    })),
  };
}

function normalizeProposalBase(value: Record<string, Json | undefined>) {
  return {
    proposalId: readString(value.proposalId),
    sourceBookIds: readStringArray(value.sourceBookIds),
    sourceAttachmentIds: readStringArray(value.sourceAttachmentIds),
    sourceChunkIds: readStringArray(value.sourceChunkIds),
    evidence: readString(value.evidence),
    confidence: coerceProposalConfidence(value.confidence),
    review: normalizeProposalReview(value.review),
  };
}

function normalizeBookMapping(value: Json | undefined): ManuscriptImportBookMapping {
  if (!isRecord(value)) {
    return createDefaultBookMapping();
  }

  return {
    mappingStatus: coerceMappingStatus(value.mappingStatus),
    suggestedAction: coerceMappingAction(value.suggestedAction),
    targetBookId: readNullableString(value.targetBookId),
    targetBookTitle: readString(value.targetBookTitle),
    matchedRecord: normalizeMatchCandidate(value.matchedRecord),
    matchCandidates: readObjectArray(value.matchCandidates).map((item) =>
      normalizeMatchCandidateRecord(item)
    ),
  };
}

function createDefaultBookMapping(): ManuscriptImportBookMapping {
  return {
    mappingStatus: "pending",
    suggestedAction: "create",
    targetBookId: null,
    targetBookTitle: "",
    matchedRecord: null,
    matchCandidates: [],
  };
}

function normalizeProposalReview(value: Json | undefined): BrainDumpProposalReview {
  if (!isRecord(value)) {
    return {
      reviewStatus: "pending",
      suggestedAction: "create",
      matchedRecord: null,
      matchCandidates: [],
      duplicateCandidates: [],
    };
  }

  return {
    reviewStatus: coerceReviewStatus(value.reviewStatus),
    suggestedAction: coerceSuggestedAction(value.suggestedAction),
    matchedRecord: normalizeMatchCandidate(value.matchedRecord),
    matchCandidates: readObjectArray(value.matchCandidates).map((item) =>
      normalizeMatchCandidateRecord(item)
    ),
    duplicateCandidates: readObjectArray(value.duplicateCandidates).map((item) => ({
      proposalIndex: readInteger(item.proposalIndex),
      proposalLabel: readString(item.proposalLabel),
      duplicateReason: readString(item.duplicateReason),
      score: readNumberOrNull(item.score),
    })),
  };
}

function normalizePlacementSuggestion(value: Json | undefined): BrainDumpTimelinePlacementSuggestion {
  if (!isRecord(value)) {
    return {
      placement: "unspecified",
      referenceEventIds: [],
      referenceEventTitles: [],
      reasoning: "",
      yearStart: null,
      yearEnd: null,
      displayDateLabel: "",
    };
  }

  const placement = readString(value.placement);

  return {
    placement:
      placement === "beginning" ||
      placement === "end" ||
      placement === "before" ||
      placement === "after" ||
      placement === "between"
        ? placement
        : "unspecified",
    referenceEventIds: readStringArray(value.referenceEventIds),
    referenceEventTitles: readStringArray(value.referenceEventTitles),
    reasoning: readString(value.reasoning),
    yearStart: readIntegerOrNull(value.yearStart),
    yearEnd: readIntegerOrNull(value.yearEnd),
    displayDateLabel: readString(value.displayDateLabel),
  };
}

function normalizeMatchCandidate(value: Json | undefined) {
  if (!isRecord(value)) {
    return null;
  }

  return normalizeMatchCandidateRecord(value);
}

function normalizeMatchCandidateRecord(
  value: Record<string, Json | undefined>
): BrainDumpProposalMatchCandidate {
  return {
    entityType: readString(value.entityType),
    recordId: readString(value.recordId),
    recordLabel: readString(value.recordLabel),
    matchReason: readString(value.matchReason),
    score: readNumberOrNull(value.score),
  };
}

function coerceStage(value: Json | undefined): ManuscriptImportStage {
  return typeof value === "string" &&
    (MANUSCRIPT_IMPORT_STAGE_VALUES as readonly string[]).includes(value)
    ? (value as ManuscriptImportStage)
    : "upload";
}

function coerceImportMode(value: Json | undefined): ManuscriptImportMode {
  return value === "series" ? "series" : "single_book";
}

function coerceParseStatus(value: Json | undefined): ManuscriptImportParseStatus {
  return typeof value === "string" &&
    (MANUSCRIPT_IMPORT_PARSE_STATUS_VALUES as readonly string[]).includes(value)
    ? (value as ManuscriptImportParseStatus)
    : "pending";
}

function coerceBookStatus(value: Json | undefined): ManuscriptImportBookStatus {
  return typeof value === "string" &&
    (MANUSCRIPT_IMPORT_BOOK_STATUS_VALUES as readonly string[]).includes(value)
    ? (value as ManuscriptImportBookStatus)
    : "pending_mapping";
}

function coerceMappingStatus(value: Json | undefined): ManuscriptImportMappingStatus {
  return value === "saved" ? "saved" : "pending";
}

function coerceMappingAction(value: Json | undefined) {
  return value === "update" ? "update" : "create";
}

function coerceChunkStatus(value: Json | undefined): ManuscriptImportChunkStatus {
  return typeof value === "string" &&
    (MANUSCRIPT_IMPORT_CHUNK_STATUS_VALUES as readonly string[]).includes(value)
    ? (value as ManuscriptImportChunkStatus)
    : "pending";
}

function coerceProposalConfidence(value: Json | undefined): BrainDumpProposalConfidence {
  return value === "low" || value === "medium" || value === "high" ? value : "medium";
}

function coerceReviewStatus(value: Json | undefined) {
  return value === "reviewed" || value === "applied" ? value : "pending";
}

function coerceSuggestedAction(value: Json | undefined) {
  return value === "update" || value === "merge" || value === "ignore" ? value : "create";
}

function isRecord(value: Json | null | undefined): value is Record<string, Json | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readObjectArray(value: Json | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is Record<string, Json | undefined> => isRecord(item));
}

function readString(value: Json | undefined) {
  return typeof value === "string" ? value : "";
}

function readNullableString(value: Json | undefined) {
  const normalized = readString(value).trim();
  return normalized || null;
}

function readStringArray(value: Json | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function readInteger(value: Json | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : -1;
}

function readIntegerOrNull(value: Json | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : null;
}

function readIntegerOrZero(value: Json | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : 0;
}

function readPositiveInteger(value: Json | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1;
  }

  return Math.max(1, Math.trunc(value));
}

function readNumberOrNull(value: Json | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
