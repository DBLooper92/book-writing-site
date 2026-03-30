import type { Json } from "@/types/database";

export const BRAIN_DUMP_PROPOSAL_CONFIDENCE_VALUES = ["low", "medium", "high"] as const;
export const BRAIN_DUMP_PROPOSAL_REVIEW_STATUS_VALUES = [
  "pending",
  "reviewed",
  "applied",
] as const;
export const BRAIN_DUMP_PROPOSAL_SUGGESTED_ACTION_VALUES = [
  "create",
  "update",
  "merge",
  "ignore",
] as const;
export const BRAIN_DUMP_TIMELINE_PLACEMENT_VALUES = [
  "unspecified",
  "beginning",
  "end",
  "before",
  "after",
  "between",
] as const;

export type BrainDumpProposalConfidence =
  (typeof BRAIN_DUMP_PROPOSAL_CONFIDENCE_VALUES)[number];
export type BrainDumpProposalReviewStatus =
  (typeof BRAIN_DUMP_PROPOSAL_REVIEW_STATUS_VALUES)[number];
export type BrainDumpProposalSuggestedAction =
  (typeof BRAIN_DUMP_PROPOSAL_SUGGESTED_ACTION_VALUES)[number];
export type BrainDumpTimelinePlacement =
  (typeof BRAIN_DUMP_TIMELINE_PLACEMENT_VALUES)[number];

export type BrainDumpProposalMatchCandidate = {
  entityType: string;
  recordId: string;
  recordLabel: string;
  matchReason: string;
  score: number | null;
};

export type BrainDumpProposalDuplicateCandidate = {
  proposalIndex: number;
  proposalLabel: string;
  duplicateReason: string;
  score: number | null;
};

export type BrainDumpProposalReview = {
  reviewStatus: BrainDumpProposalReviewStatus;
  suggestedAction: BrainDumpProposalSuggestedAction;
  matchedRecord: BrainDumpProposalMatchCandidate | null;
  matchCandidates: BrainDumpProposalMatchCandidate[];
  duplicateCandidates: BrainDumpProposalDuplicateCandidate[];
};

export function selectBrainDumpMatchedRecord(
  review: BrainDumpProposalReview,
  recordId: string | null
) {
  if (!recordId) {
    return null;
  }

  if (review.matchedRecord?.recordId === recordId) {
    return review.matchedRecord;
  }

  return review.matchCandidates.find((candidate) => candidate.recordId === recordId) ?? null;
}

export type BrainDumpTimelinePlacementSuggestion = {
  placement: BrainDumpTimelinePlacement;
  referenceEventIds: string[];
  referenceEventTitles: string[];
  reasoning: string;
  yearStart: number | null;
  yearEnd: number | null;
  displayDateLabel: string;
};

export type BrainDumpCharacterProposal = {
  name: string;
  summary: string;
  characterType: string;
  importanceLevel: string;
  traits: string[];
  motivations: string[];
  relatedSceneTitles: string[];
  evidence: string;
  confidence: BrainDumpProposalConfidence;
  review: BrainDumpProposalReview;
};

export type BrainDumpTimelineEventProposal = {
  title: string;
  summary: string;
  eventType: string;
  dateLabel: string;
  linkedCharacterNames: string[];
  linkedLocationNames: string[];
  linkedChapterTitles: string[];
  linkedSceneTitles: string[];
  evidence: string;
  confidence: BrainDumpProposalConfidence;
  review: BrainDumpProposalReview;
  placementSuggestion: BrainDumpTimelinePlacementSuggestion;
};

export type BrainDumpChapterOutlineProposal = {
  title: string;
  summary: string;
  purpose: string;
  pointOfViewCharacterName: string;
  estimatedChapterNumber: string;
  sceneTitles: string[];
  evidence: string;
  confidence: BrainDumpProposalConfidence;
  review: BrainDumpProposalReview;
};

export type BrainDumpSceneProposal = {
  title: string;
  summary: string;
  sceneType: string;
  pointOfViewCharacterName: string;
  goal: string;
  conflict: string;
  outcome: string;
  linkedTimelineEventTitles: string[];
  evidence: string;
  confidence: BrainDumpProposalConfidence;
  review: BrainDumpProposalReview;
};

export type BrainDumpExtractionResult = {
  summary: string;
  continuityWarnings: string[];
  characters: BrainDumpCharacterProposal[];
  timelineEvents: BrainDumpTimelineEventProposal[];
  chapterOutlines: BrainDumpChapterOutlineProposal[];
  scenes: BrainDumpSceneProposal[];
  unresolvedQuestions: string[];
  suggestedNextActions: string[];
};

export const BRAIN_DUMP_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "continuityWarnings",
    "characters",
    "timelineEvents",
    "chapterOutlines",
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
          confidence: enumSchema(BRAIN_DUMP_PROPOSAL_CONFIDENCE_VALUES),
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
          confidence: enumSchema(BRAIN_DUMP_PROPOSAL_CONFIDENCE_VALUES),
        },
      },
    },
    chapterOutlines: {
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
          confidence: enumSchema(BRAIN_DUMP_PROPOSAL_CONFIDENCE_VALUES),
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
          confidence: enumSchema(BRAIN_DUMP_PROPOSAL_CONFIDENCE_VALUES),
        },
      },
    },
    unresolvedQuestions: stringArraySchema(),
    suggestedNextActions: stringArraySchema(),
  },
} as const;

export function normalizeBrainDumpExtractionResult(value: Json | null | undefined) {
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
      confidence: coerceProposalConfidence(item.confidence),
      review: normalizeProposalReview(item.review),
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
      confidence: coerceProposalConfidence(item.confidence),
      review: normalizeProposalReview(item.review),
      placementSuggestion: normalizeTimelinePlacementSuggestion(item.placementSuggestion),
    })),
    chapterOutlines: readObjectArray(value.chapterOutlines).map((item) => ({
      title: readString(item.title),
      summary: readString(item.summary),
      purpose: readString(item.purpose),
      pointOfViewCharacterName: readString(item.pointOfViewCharacterName),
      estimatedChapterNumber: readString(item.estimatedChapterNumber),
      sceneTitles: readStringArray(item.sceneTitles),
      evidence: readString(item.evidence),
      confidence: coerceProposalConfidence(item.confidence),
      review: normalizeProposalReview(item.review),
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
      confidence: coerceProposalConfidence(item.confidence),
      review: normalizeProposalReview(item.review),
    })),
    unresolvedQuestions: readStringArray(value.unresolvedQuestions),
    suggestedNextActions: readStringArray(value.suggestedNextActions),
  } satisfies BrainDumpExtractionResult;
}

export function createEmptyBrainDumpExtractionResult() {
  return {
    summary: "",
    continuityWarnings: [],
    characters: [],
    timelineEvents: [],
    chapterOutlines: [],
    scenes: [],
    unresolvedQuestions: [],
    suggestedNextActions: [],
  } satisfies BrainDumpExtractionResult;
}

function stringArraySchema() {
  return {
    type: "array",
    items: { type: "string" },
  } as const;
}

function enumSchema<const Values extends readonly string[]>(values: Values) {
  return {
    type: "string",
    enum: [...values],
  } as const;
}

function coerceProposalConfidence(value: unknown): BrainDumpProposalConfidence {
  return typeof value === "string" &&
    (BRAIN_DUMP_PROPOSAL_CONFIDENCE_VALUES as readonly string[]).includes(value)
    ? (value as BrainDumpProposalConfidence)
    : "medium";
}

function normalizeProposalReview(value: Json | undefined): BrainDumpProposalReview {
  if (!isRecord(value)) {
    return createDefaultProposalReview();
  }

  return {
    reviewStatus: coerceProposalReviewStatus(value.reviewStatus),
    suggestedAction: coerceProposalSuggestedAction(value.suggestedAction),
    matchedRecord: normalizeMatchCandidate(value.matchedRecord),
    matchCandidates: readObjectArray(value.matchCandidates).map((item) =>
      normalizeMatchCandidateRecord(item)
    ),
    duplicateCandidates: readObjectArray(value.duplicateCandidates).map((item) =>
      normalizeDuplicateCandidateRecord(item)
    ),
  };
}

function normalizeTimelinePlacementSuggestion(
  value: Json | undefined
): BrainDumpTimelinePlacementSuggestion {
  if (!isRecord(value)) {
    return createDefaultTimelinePlacementSuggestion();
  }

  return {
    placement: coerceTimelinePlacement(value.placement),
    referenceEventIds: readStringArray(value.referenceEventIds),
    referenceEventTitles: readStringArray(value.referenceEventTitles),
    reasoning: readString(value.reasoning),
    yearStart: readIntegerOrNull(value.yearStart),
    yearEnd: readIntegerOrNull(value.yearEnd),
    displayDateLabel: readString(value.displayDateLabel),
  };
}

function createDefaultProposalReview(): BrainDumpProposalReview {
  return {
    reviewStatus: "pending",
    suggestedAction: "create",
    matchedRecord: null,
    matchCandidates: [],
    duplicateCandidates: [],
  };
}

function createDefaultTimelinePlacementSuggestion(): BrainDumpTimelinePlacementSuggestion {
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

function normalizeDuplicateCandidateRecord(
  value: Record<string, Json | undefined>
): BrainDumpProposalDuplicateCandidate {
  return {
    proposalIndex: readInteger(value.proposalIndex),
    proposalLabel: readString(value.proposalLabel),
    duplicateReason: readString(value.duplicateReason),
    score: readNumberOrNull(value.score),
  };
}

function coerceProposalReviewStatus(value: unknown): BrainDumpProposalReviewStatus {
  return typeof value === "string" &&
    (BRAIN_DUMP_PROPOSAL_REVIEW_STATUS_VALUES as readonly string[]).includes(value)
    ? (value as BrainDumpProposalReviewStatus)
    : "pending";
}

function coerceProposalSuggestedAction(value: unknown): BrainDumpProposalSuggestedAction {
  return typeof value === "string" &&
    (BRAIN_DUMP_PROPOSAL_SUGGESTED_ACTION_VALUES as readonly string[]).includes(value)
    ? (value as BrainDumpProposalSuggestedAction)
    : "create";
}

function coerceTimelinePlacement(value: unknown): BrainDumpTimelinePlacement {
  return typeof value === "string" &&
    (BRAIN_DUMP_TIMELINE_PLACEMENT_VALUES as readonly string[]).includes(value)
    ? (value as BrainDumpTimelinePlacement)
    : "unspecified";
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

function readNumberOrNull(value: Json | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readInteger(value: Json | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : -1;
}

function readIntegerOrNull(value: Json | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : null;
}

function readStringArray(value: Json | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}
