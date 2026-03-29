import type { Json } from "@/types/database";

export const BRAIN_DUMP_PROPOSAL_CONFIDENCE_VALUES = ["low", "medium", "high"] as const;

export type BrainDumpProposalConfidence =
  (typeof BRAIN_DUMP_PROPOSAL_CONFIDENCE_VALUES)[number];

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

const EMPTY_BRAIN_DUMP_RESULT: BrainDumpExtractionResult = {
  summary: "",
  continuityWarnings: [],
  characters: [],
  timelineEvents: [],
  chapterOutlines: [],
  scenes: [],
  unresolvedQuestions: [],
  suggestedNextActions: [],
};

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
    })),
    unresolvedQuestions: readStringArray(value.unresolvedQuestions),
    suggestedNextActions: readStringArray(value.suggestedNextActions),
  } satisfies BrainDumpExtractionResult;
}

export function createEmptyBrainDumpExtractionResult() {
  return EMPTY_BRAIN_DUMP_RESULT;
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

function readStringArray(value: Json | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}
