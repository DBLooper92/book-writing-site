import type { AppTimestamp } from "@/types/timestamp";

export const AI_SESSION_STATUS_VALUES = [
  "planned",
  "in_progress",
  "completed",
  "archived",
] as const;
export const AI_SESSION_TYPE_VALUES = [
  "brainstorm",
  "summary",
  "editing",
  "drafting",
  "schema_seed",
  "other",
] as const;
export const AI_SESSION_CANON_LEVEL_VALUES = [
  "core",
  "working",
  "draft",
  "non_canon",
] as const;
export const AI_SESSION_CONFIDENCE_VALUES = [
  "low",
  "medium",
  "high",
  "confirmed",
] as const;

export type AiSessionStatus = (typeof AI_SESSION_STATUS_VALUES)[number];
export type AiSessionType = (typeof AI_SESSION_TYPE_VALUES)[number];
export type AiSessionCanonLevel = (typeof AI_SESSION_CANON_LEVEL_VALUES)[number];
export type AiSessionConfidence = (typeof AI_SESSION_CONFIDENCE_VALUES)[number];
export type AiSessionTimestamp = AppTimestamp;

export type AiSession = {
  id: string;
  projectId: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  status: AiSessionStatus;
  tags: string[];
  isArchived: boolean;
  canonLevel: AiSessionCanonLevel;
  confidence: AiSessionConfidence;
  sessionType: AiSessionType;
  provider: string;
  model: string;
  purpose: string;
  promptExcerpt: string;
  outputSummary: string;
  linkedEntityTypes: string[];
  linkedEntityIds: string[];
  messagesCount: number | null;
  createdAt: AiSessionTimestamp;
  updatedAt: AiSessionTimestamp;
};

export type AiSessionFormValues = {
  title: string;
  summary: string;
  description: string;
  status: AiSessionStatus;
  sessionType: AiSessionType;
  provider: string;
  model: string;
  purpose: string;
  promptExcerpt: string;
  outputSummary: string;
  linkedEntityTypes: string;
  linkedEntityIds: string;
  messagesCount: string;
};

export type NormalizedAiSessionFormValues = {
  title: string;
  summary: string;
  description: string;
  status: AiSessionStatus;
  sessionType: AiSessionType;
  provider: string;
  model: string;
  purpose: string;
  promptExcerpt: string;
  outputSummary: string;
  linkedEntityTypes: string[];
  linkedEntityIds: string[];
  messagesCount: number | null;
};

type BuildAiSessionDocumentInput = {
  id: string;
  projectId: string;
  values: NormalizedAiSessionFormValues;
};

export type AiSessionDocumentData = Omit<AiSession, "createdAt" | "updatedAt">;

export const AI_SESSION_STATUS_OPTIONS: ReadonlyArray<{
  value: AiSessionStatus;
  label: string;
}> = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

export const AI_SESSION_TYPE_OPTIONS: ReadonlyArray<{
  value: AiSessionType;
  label: string;
}> = [
  { value: "brainstorm", label: "Brainstorm" },
  { value: "summary", label: "Summary" },
  { value: "editing", label: "Editing" },
  { value: "drafting", label: "Drafting" },
  { value: "schema_seed", label: "Schema seed" },
  { value: "other", label: "Other" },
];

const DEFAULT_AI_SESSION_STATUS: AiSessionStatus = "completed";
const DEFAULT_AI_SESSION_TYPE: AiSessionType = "brainstorm";
const DEFAULT_AI_SESSION_CANON_LEVEL: AiSessionCanonLevel = "working";
const DEFAULT_AI_SESSION_CONFIDENCE: AiSessionConfidence = "medium";

export function createEmptyAiSessionFormValues(): AiSessionFormValues {
  return {
    title: "",
    summary: "",
    description: "",
    status: DEFAULT_AI_SESSION_STATUS,
    sessionType: DEFAULT_AI_SESSION_TYPE,
    provider: "",
    model: "",
    purpose: "",
    promptExcerpt: "",
    outputSummary: "",
    linkedEntityTypes: "",
    linkedEntityIds: "",
    messagesCount: "",
  };
}

export function aiSessionToFormValues(aiSession: AiSession): AiSessionFormValues {
  return {
    title: aiSession.title,
    summary: aiSession.summary,
    description: aiSession.description,
    status: aiSession.status,
    sessionType: aiSession.sessionType,
    provider: aiSession.provider,
    model: aiSession.model,
    purpose: aiSession.purpose,
    promptExcerpt: aiSession.promptExcerpt,
    outputSummary: aiSession.outputSummary,
    linkedEntityTypes: aiSession.linkedEntityTypes.join(", "),
    linkedEntityIds: aiSession.linkedEntityIds.join(", "),
    messagesCount:
      typeof aiSession.messagesCount === "number" ? String(aiSession.messagesCount) : "",
  };
}

export function normalizeAiSessionFormValues(
  values: AiSessionFormValues
): NormalizedAiSessionFormValues {
  return {
    title: values.title.trim(),
    summary: values.summary.trim(),
    description: values.description.trim(),
    status: coerceAiSessionStatus(values.status),
    sessionType: coerceAiSessionType(values.sessionType),
    provider: values.provider.trim(),
    model: values.model.trim(),
    purpose: values.purpose.trim(),
    promptExcerpt: values.promptExcerpt.trim(),
    outputSummary: values.outputSummary.trim(),
    linkedEntityTypes: parseCommaSeparatedList(values.linkedEntityTypes),
    linkedEntityIds: parseCommaSeparatedList(values.linkedEntityIds),
    messagesCount: parseIntegerOrNull(values.messagesCount),
  };
}

export function buildAiSessionDocument({
  id,
  projectId,
  values,
}: BuildAiSessionDocumentInput): AiSessionDocumentData {
  return {
    id,
    projectId,
    title: values.title,
    slug: slugify(values.title),
    summary: values.summary,
    description: values.description,
    status: values.status,
    tags: [],
    isArchived: values.status === "archived",
    canonLevel: DEFAULT_AI_SESSION_CANON_LEVEL,
    confidence: DEFAULT_AI_SESSION_CONFIDENCE,
    sessionType: values.sessionType,
    provider: values.provider,
    model: values.model,
    purpose: values.purpose,
    promptExcerpt: values.promptExcerpt,
    outputSummary: values.outputSummary,
    linkedEntityTypes: values.linkedEntityTypes,
    linkedEntityIds: values.linkedEntityIds,
    messagesCount: values.messagesCount,
  };
}

export function coerceAiSessionStatus(value: unknown): AiSessionStatus {
  if (isAllowedValue(AI_SESSION_STATUS_VALUES, value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = normalizeEnumCandidate(value);

    if (isAllowedValue(AI_SESSION_STATUS_VALUES, normalized)) {
      return normalized;
    }

    if (normalized === "done" || normalized === "complete") {
      return "completed";
    }

    if (normalized === "active") {
      return "in_progress";
    }
  }

  return DEFAULT_AI_SESSION_STATUS;
}

export function coerceAiSessionType(value: unknown): AiSessionType {
  if (isAllowedValue(AI_SESSION_TYPE_VALUES, value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = normalizeEnumCandidate(value);

    if (isAllowedValue(AI_SESSION_TYPE_VALUES, normalized)) {
      return normalized;
    }

    if (normalized === "schema_seed" || normalized === "schema_seeding") {
      return "schema_seed";
    }
  }

  return DEFAULT_AI_SESSION_TYPE;
}

export function coerceAiSessionCanonLevel(value: unknown): AiSessionCanonLevel {
  return isAllowedValue(AI_SESSION_CANON_LEVEL_VALUES, value)
    ? value
    : DEFAULT_AI_SESSION_CANON_LEVEL;
}

export function coerceAiSessionConfidence(value: unknown): AiSessionConfidence {
  if (isAllowedValue(AI_SESSION_CONFIDENCE_VALUES, value)) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    if (value >= 0.95) {
      return "confirmed";
    }

    if (value >= 0.7) {
      return "high";
    }

    if (value >= 0.35) {
      return "medium";
    }

    return "low";
  }

  if (typeof value === "string") {
    const normalized = normalizeEnumCandidate(value);

    if (normalized === "core") {
      return "confirmed";
    }

    if (normalized === "uncertain") {
      return "low";
    }
  }

  return DEFAULT_AI_SESSION_CONFIDENCE;
}

export function slugifyAiSessionTitle(value: string) {
  return slugify(value);
}

function isAllowedValue<const Values extends readonly string[]>(
  values: Values,
  value: unknown
): value is Values[number] {
  return typeof value === "string" && values.includes(value);
}

function parseCommaSeparatedList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseIntegerOrNull(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeEnumCandidate(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "ai-session"
  );
}
