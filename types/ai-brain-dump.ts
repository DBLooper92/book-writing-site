import type { TimelineEventFormValues } from "@/types/timeline-event";

export const BRAIN_DUMP_ENTITY_TARGETS = [
  "era",
  "book",
  "chapter",
  "scene",
  "character",
  "location",
  "faction",
  "culture",
  "religion",
  "technology",
  "plotThread",
  "theme",
] as const;

export const BRAIN_DUMP_ENTITY_ACTIONS = [
  "link",
  "create",
  "ignore",
  "ambiguous",
  "unresolved",
] as const;

export const BRAIN_DUMP_CONFIDENCE_VALUES = [
  "low",
  "medium",
  "high",
  "confirmed",
] as const;

export type BrainDumpEntityTarget = (typeof BRAIN_DUMP_ENTITY_TARGETS)[number];
export type BrainDumpEntityAction = (typeof BRAIN_DUMP_ENTITY_ACTIONS)[number];
export type BrainDumpConfidence = (typeof BRAIN_DUMP_CONFIDENCE_VALUES)[number];

export type BrainDumpCandidate = {
  id: string;
  label: string;
  meta?: string;
};

export type TimelineBrainDumpContextEvent = {
  chronologyLabel: string;
  id: string;
  position: number;
  relation: "before" | "after";
  title: string;
};

export type TimelineBrainDumpInsertionContext = {
  helperText?: string;
  label?: string;
  surroundingEvents: TimelineBrainDumpContextEvent[];
};

export type BrainDumpEntitySuggestion = {
  id: string;
  target: BrainDumpEntityTarget;
  mention: string;
  reason: string;
  confidence: BrainDumpConfidence;
  suggestedAction: BrainDumpEntityAction;
  candidates: BrainDumpCandidate[];
  suggestedCreateFields: {
    description?: string;
    publicWikiSummary?: string;
    summary?: string;
    titleOrName: string;
  };
};

export type BrainDumpPreviewResult = {
  entitySuggestions: BrainDumpEntitySuggestion[];
  prefill: TimelineEventFormValues;
  telemetry?: {
    attempts: number;
    category: string;
    durationMs: number;
    outputTokens?: number;
    promptTokens?: number;
    retriesUsed: number;
    totalTokens?: number;
  } | null;
  warnings: string[];
};

export type BrainDumpResolution = {
  action: "create" | "ignore" | "link";
  linkedId?: string | null;
  suggestionId: string;
  target: BrainDumpEntityTarget;
};

export type AiTimelineCreateDraftState = {
  approvedAt: string;
  brainDumpText: string;
  preview: BrainDumpPreviewResult;
  resolutions: BrainDumpResolution[];
};

export type MultiEventBrainDumpEventDraft = {
  draftId: string;
  entitySuggestions: BrainDumpEntitySuggestion[];
  prefill: TimelineEventFormValues;
  suggestedPredecessorDraftIds: string[];
  suggestedSuccessorDraftIds: string[];
  warnings: string[];
};

export type MultiEventBrainDumpPreviewResult = {
  events: MultiEventBrainDumpEventDraft[];
  warnings: string[];
};

export type TimelineBrainDumpProjectContext = {
  insertionContext?: TimelineBrainDumpInsertionContext;
  predecessorEventIds?: string[];
  successorEventIds?: string[];
  yearEnd?: string;
  yearStart?: string;
};

export type MultiEventDraftState = {
  approvedAt: string;
  events: Array<{
    draftId: string;
    prefill: TimelineEventFormValues;
    resolutions: BrainDumpResolution[];
    predecessorDraftIds: string[];
    successorDraftIds: string[];
    skipped: boolean;
  }>;
  jobId: string;
};

export type MultiEventApplyReport = {
  failed: Array<{
    draftId: string;
    error: string;
  }>;
  skipped: Array<{
    draftId: string;
    reason: string;
  }>;
  success: Array<{
    createdTimelineEventId: string;
    draftId: string;
  }>;
};

export type AiJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "failed-needs-rerun"
  | "canceled";

export type AiJobProgress = {
  completedChunks: number;
  currentStep: string;
  totalAttempts?: number;
  totalRetries?: number;
  totalChunks: number;
};

export type AiJobChunkMetric = {
  attempts: number;
  category:
    | "auth"
    | "canceled"
    | "invalid_response"
    | "network"
    | "none"
    | "rate_limited"
    | "timeout"
    | "unknown";
  chunkIndex: number;
  durationMs: number;
  outputTokens?: number;
  promptTokens?: number;
  retriesUsed: number;
  totalTokens?: number;
};

export type AiJobSummary = {
  createdAt: string;
  finishedAt: string | null;
  id: string;
  status: AiJobStatus;
  title: string;
  updatedAt: string;
};

export type AiMultiEventJobRecord = AiJobSummary & {
  chunkMetrics?: AiJobChunkMetric[];
  errorMessage?: string | null;
  failureCategory?: "auth" | "canceled" | "invalid_response" | "network" | "rate_limited" | "timeout" | "unknown" | null;
  input?: {
    brainDumpText?: string;
    projectContext?: TimelineBrainDumpProjectContext | null;
  };
  progress: AiJobProgress;
  result: MultiEventBrainDumpPreviewResult | null;
  warnings: string[];
};

export type BrainDumpValidationScenarioResult = {
  assertionPassCount: number;
  assertionTotalCount: number;
  durationMs: number;
  brainDumpText?: string;
  id: string;
  mode: "multi" | "single" | "stress";
  notes: string[];
  pass: boolean;
};

export type BrainDumpValidationReport = {
  costGuardrail: {
    budgetUsd: number;
    estimatedCostUsd: number;
  };
  createdAt: string;
  estimatedTokenUsage: {
    completionTokens: number;
    promptTokens: number;
    totalTokens: number;
  };
  id: string;
  metrics: {
    mappingCorrectnessPct: number;
    scenarioPassPct: number;
  };
  path: string;
  projectId: string;
  scenarioResults: BrainDumpValidationScenarioResult[];
  totals: {
    passed: number;
    scenarios: number;
  };
};
