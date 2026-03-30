import type { Json } from "@/types/database";
import type { BrainDumpTimelinePlacement } from "@/types/ai-brain-dump";

export type BrainDumpContextRecordSummary = {
  entityType: "timeline_event" | "character" | "chapter" | "scene";
  id: string;
  label: string;
  summary: string;
  meta: string;
  matchedBy: string;
};

export type BrainDumpTimelineProposalContext = {
  proposalIndex: number;
  matchedTimelineEvent: BrainDumpContextRecordSummary | null;
  candidateTimelineEvent: BrainDumpContextRecordSummary | null;
  placementRecommendation: {
    placement: BrainDumpTimelinePlacement;
    referenceEventIds: string[];
    referenceEventTitles: string[];
    reasoning: string;
  };
  neighboringTimelineEvents: {
    before: BrainDumpContextRecordSummary[];
    after: BrainDumpContextRecordSummary[];
  };
  linkedCharacters: BrainDumpContextRecordSummary[];
  linkedChapters: BrainDumpContextRecordSummary[];
  linkedScenes: BrainDumpContextRecordSummary[];
  continuityWarnings: string[];
  notes: string[];
};

export type BrainDumpCharacterProposalContext = {
  proposalIndex: number;
  matchedCharacter: BrainDumpContextRecordSummary | null;
  candidateCharacter: BrainDumpContextRecordSummary | null;
  linkedTimelineEvents: BrainDumpContextRecordSummary[];
  relatedScenes: BrainDumpContextRecordSummary[];
  continuityWarnings: string[];
  notes: string[];
};

export type BrainDumpChapterProposalContext = {
  proposalIndex: number;
  matchedChapter: BrainDumpContextRecordSummary | null;
  candidateChapter: BrainDumpContextRecordSummary | null;
  pointOfViewCharacter: BrainDumpContextRecordSummary | null;
  linkedScenes: BrainDumpContextRecordSummary[];
  continuityWarnings: string[];
  notes: string[];
};

export type BrainDumpSceneProposalContext = {
  proposalIndex: number;
  matchedScene: BrainDumpContextRecordSummary | null;
  candidateScene: BrainDumpContextRecordSummary | null;
  parentChapter: BrainDumpContextRecordSummary | null;
  pointOfViewCharacter: BrainDumpContextRecordSummary | null;
  linkedTimelineEvents: BrainDumpContextRecordSummary[];
  continuityWarnings: string[];
  notes: string[];
};

export function normalizeBrainDumpTimelineProposalContext(value: Json | null | undefined) {
  if (!isRecord(value)) {
    return null;
  }

  return {
    proposalIndex: readInteger(value.proposalIndex),
    matchedTimelineEvent: normalizeContextRecordSummary(value.matchedTimelineEvent),
    candidateTimelineEvent: normalizeContextRecordSummary(value.candidateTimelineEvent),
    placementRecommendation: normalizePlacementRecommendation(value.placementRecommendation),
    neighboringTimelineEvents: normalizeNeighboringTimelineEvents(value.neighboringTimelineEvents),
    linkedCharacters: readObjectArray(value.linkedCharacters).map(normalizeContextRecordSummaryRecord),
    linkedChapters: readObjectArray(value.linkedChapters).map(normalizeContextRecordSummaryRecord),
    linkedScenes: readObjectArray(value.linkedScenes).map(normalizeContextRecordSummaryRecord),
    continuityWarnings: readStringArray(value.continuityWarnings),
    notes: readStringArray(value.notes),
  } satisfies BrainDumpTimelineProposalContext;
}

export function normalizeBrainDumpCharacterProposalContext(value: Json | null | undefined) {
  if (!isRecord(value)) {
    return null;
  }

  return {
    proposalIndex: readInteger(value.proposalIndex),
    matchedCharacter: normalizeContextRecordSummary(value.matchedCharacter),
    candidateCharacter: normalizeContextRecordSummary(value.candidateCharacter),
    linkedTimelineEvents: readObjectArray(value.linkedTimelineEvents).map(
      normalizeContextRecordSummaryRecord
    ),
    relatedScenes: readObjectArray(value.relatedScenes).map(normalizeContextRecordSummaryRecord),
    continuityWarnings: readStringArray(value.continuityWarnings),
    notes: readStringArray(value.notes),
  } satisfies BrainDumpCharacterProposalContext;
}

export function normalizeBrainDumpChapterProposalContext(value: Json | null | undefined) {
  if (!isRecord(value)) {
    return null;
  }

  return {
    proposalIndex: readInteger(value.proposalIndex),
    matchedChapter: normalizeContextRecordSummary(value.matchedChapter),
    candidateChapter: normalizeContextRecordSummary(value.candidateChapter),
    pointOfViewCharacter: normalizeContextRecordSummary(value.pointOfViewCharacter),
    linkedScenes: readObjectArray(value.linkedScenes).map(normalizeContextRecordSummaryRecord),
    continuityWarnings: readStringArray(value.continuityWarnings),
    notes: readStringArray(value.notes),
  } satisfies BrainDumpChapterProposalContext;
}

export function normalizeBrainDumpSceneProposalContext(value: Json | null | undefined) {
  if (!isRecord(value)) {
    return null;
  }

  return {
    proposalIndex: readInteger(value.proposalIndex),
    matchedScene: normalizeContextRecordSummary(value.matchedScene),
    candidateScene: normalizeContextRecordSummary(value.candidateScene),
    parentChapter: normalizeContextRecordSummary(value.parentChapter),
    pointOfViewCharacter: normalizeContextRecordSummary(value.pointOfViewCharacter),
    linkedTimelineEvents: readObjectArray(value.linkedTimelineEvents).map(
      normalizeContextRecordSummaryRecord
    ),
    continuityWarnings: readStringArray(value.continuityWarnings),
    notes: readStringArray(value.notes),
  } satisfies BrainDumpSceneProposalContext;
}

function normalizePlacementRecommendation(value: Json | undefined) {
  if (!isRecord(value)) {
    return {
      placement: "unspecified" as const,
      referenceEventIds: [],
      referenceEventTitles: [],
      reasoning: "",
    };
  }

  const placement = coerceTimelinePlacement(readString(value.placement));

  return {
    placement,
    referenceEventIds: readStringArray(value.referenceEventIds),
    referenceEventTitles: readStringArray(value.referenceEventTitles),
    reasoning: readString(value.reasoning),
  };
}

function coerceTimelinePlacement(value: string): BrainDumpTimelinePlacement {
  return value === "beginning" ||
    value === "end" ||
    value === "before" ||
    value === "after" ||
    value === "between"
    ? value
    : "unspecified";
}

function normalizeNeighboringTimelineEvents(value: Json | undefined) {
  if (!isRecord(value)) {
    return {
      before: [],
      after: [],
    };
  }

  return {
    before: readObjectArray(value.before).map(normalizeContextRecordSummaryRecord),
    after: readObjectArray(value.after).map(normalizeContextRecordSummaryRecord),
  };
}

function normalizeContextRecordSummary(value: Json | undefined) {
  if (!isRecord(value)) {
    return null;
  }

  return normalizeContextRecordSummaryRecord(value);
}

function normalizeContextRecordSummaryRecord(
  value: Record<string, Json | undefined>
): BrainDumpContextRecordSummary {
  const entityType = readString(value.entityType);

  return {
    entityType:
      entityType === "character" ||
      entityType === "chapter" ||
      entityType === "scene" ||
      entityType === "timeline_event"
        ? entityType
        : "timeline_event",
    id: readString(value.id),
    label: readString(value.label),
    summary: readString(value.summary),
    meta: readString(value.meta),
    matchedBy: readString(value.matchedBy),
  };
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

function readInteger(value: Json | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : -1;
}

function readStringArray(value: Json | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}
