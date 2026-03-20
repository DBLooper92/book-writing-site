import type { Timestamp } from "firebase/firestore";

export const RETCON_STATUS_VALUES = [
  "open",
  "in_review",
  "resolved",
  "archived",
] as const;
export const RETCON_IMPACT_LEVEL_VALUES = [
  "low",
  "medium",
  "high",
  "critical",
] as const;
export const RETCON_CANON_LEVEL_VALUES = [
  "core",
  "working",
  "draft",
  "non_canon",
] as const;
export const RETCON_CONFIDENCE_VALUES = [
  "low",
  "medium",
  "high",
  "confirmed",
] as const;

export type RetconStatus = (typeof RETCON_STATUS_VALUES)[number];
export type RetconImpactLevel = (typeof RETCON_IMPACT_LEVEL_VALUES)[number];
export type RetconCanonLevel = (typeof RETCON_CANON_LEVEL_VALUES)[number];
export type RetconConfidence = (typeof RETCON_CONFIDENCE_VALUES)[number];
export type RetconTimestamp = Timestamp | null;

export type Retcon = {
  id: string;
  projectId: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  status: RetconStatus;
  tags: string[];
  isArchived: boolean;
  canonLevel: RetconCanonLevel;
  confidence: RetconConfidence;
  oldCanon: string;
  newCanon: string;
  reason: string;
  impactLevel: RetconImpactLevel;
  affectedEntityTypes: string[];
  affectedEntityIds: string[];
  resolved: boolean;
  createdAt: RetconTimestamp;
  updatedAt: RetconTimestamp;
};

export type RetconFormValues = {
  title: string;
  summary: string;
  description: string;
  status: RetconStatus;
  oldCanon: string;
  newCanon: string;
  reason: string;
  impactLevel: RetconImpactLevel;
  affectedEntityTypes: string;
  affectedEntityIds: string;
  resolved: boolean;
};

export type NormalizedRetconFormValues = {
  title: string;
  summary: string;
  description: string;
  status: RetconStatus;
  oldCanon: string;
  newCanon: string;
  reason: string;
  impactLevel: RetconImpactLevel;
  affectedEntityTypes: string[];
  affectedEntityIds: string[];
  resolved: boolean;
};

type BuildRetconDocumentInput = {
  id: string;
  projectId: string;
  values: NormalizedRetconFormValues;
};

export type RetconDocumentData = Omit<Retcon, "createdAt" | "updatedAt">;

export const RETCON_STATUS_OPTIONS: ReadonlyArray<{
  value: RetconStatus;
  label: string;
}> = [
  { value: "open", label: "Open" },
  { value: "in_review", label: "In review" },
  { value: "resolved", label: "Resolved" },
  { value: "archived", label: "Archived" },
];

export const RETCON_IMPACT_LEVEL_OPTIONS: ReadonlyArray<{
  value: RetconImpactLevel;
  label: string;
}> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const DEFAULT_RETCON_STATUS: RetconStatus = "open";
const DEFAULT_RETCON_IMPACT_LEVEL: RetconImpactLevel = "medium";
const DEFAULT_RETCON_CANON_LEVEL: RetconCanonLevel = "working";
const DEFAULT_RETCON_CONFIDENCE: RetconConfidence = "medium";

export function createEmptyRetconFormValues(): RetconFormValues {
  return {
    title: "",
    summary: "",
    description: "",
    status: DEFAULT_RETCON_STATUS,
    oldCanon: "",
    newCanon: "",
    reason: "",
    impactLevel: DEFAULT_RETCON_IMPACT_LEVEL,
    affectedEntityTypes: "",
    affectedEntityIds: "",
    resolved: false,
  };
}

export function retconToFormValues(retcon: Retcon): RetconFormValues {
  return {
    title: retcon.title,
    summary: retcon.summary,
    description: retcon.description,
    status: retcon.status,
    oldCanon: retcon.oldCanon,
    newCanon: retcon.newCanon,
    reason: retcon.reason,
    impactLevel: retcon.impactLevel,
    affectedEntityTypes: retcon.affectedEntityTypes.join(", "),
    affectedEntityIds: retcon.affectedEntityIds.join(", "),
    resolved: retcon.resolved,
  };
}

export function normalizeRetconFormValues(
  values: RetconFormValues
): NormalizedRetconFormValues {
  const status = coerceRetconStatus(values.status);
  const resolved = values.resolved || status === "resolved";

  return {
    title: values.title.trim(),
    summary: values.summary.trim(),
    description: values.description.trim(),
    status,
    oldCanon: values.oldCanon.trim(),
    newCanon: values.newCanon.trim(),
    reason: values.reason.trim(),
    impactLevel: coerceRetconImpactLevel(values.impactLevel),
    affectedEntityTypes: parseCommaSeparatedList(values.affectedEntityTypes),
    affectedEntityIds: parseCommaSeparatedList(values.affectedEntityIds),
    resolved,
  };
}

export function buildRetconDocument({
  id,
  projectId,
  values,
}: BuildRetconDocumentInput): RetconDocumentData {
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
    canonLevel: DEFAULT_RETCON_CANON_LEVEL,
    confidence: DEFAULT_RETCON_CONFIDENCE,
    oldCanon: values.oldCanon,
    newCanon: values.newCanon,
    reason: values.reason,
    impactLevel: values.impactLevel,
    affectedEntityTypes: values.affectedEntityTypes,
    affectedEntityIds: values.affectedEntityIds,
    resolved: values.resolved,
  };
}

export function coerceRetconStatus(value: unknown): RetconStatus {
  if (isAllowedValue(RETCON_STATUS_VALUES, value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = normalizeEnumCandidate(value);

    if (isAllowedValue(RETCON_STATUS_VALUES, normalized)) {
      return normalized;
    }

    if (normalized === "review" || normalized === "approved") {
      return "in_review";
    }

    if (
      normalized === "closed" ||
      normalized === "complete" ||
      normalized === "completed" ||
      normalized === "implemented"
    ) {
      return "resolved";
    }

    if (normalized === "active") {
      return "open";
    }
  }

  return DEFAULT_RETCON_STATUS;
}

export function coerceRetconImpactLevel(value: unknown): RetconImpactLevel {
  if (isAllowedValue(RETCON_IMPACT_LEVEL_VALUES, value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = normalizeEnumCandidate(value);

    if (isAllowedValue(RETCON_IMPACT_LEVEL_VALUES, normalized)) {
      return normalized;
    }

    if (normalized === "moderate") {
      return "medium";
    }

    if (normalized === "severe") {
      return "critical";
    }
  }

  return DEFAULT_RETCON_IMPACT_LEVEL;
}

export function coerceRetconCanonLevel(value: unknown): RetconCanonLevel {
  return isAllowedValue(RETCON_CANON_LEVEL_VALUES, value)
    ? value
    : DEFAULT_RETCON_CANON_LEVEL;
}

export function coerceRetconConfidence(value: unknown): RetconConfidence {
  if (isAllowedValue(RETCON_CONFIDENCE_VALUES, value)) {
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

  return DEFAULT_RETCON_CONFIDENCE;
}

export function slugifyRetconTitle(value: string) {
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

function normalizeEnumCandidate(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "retcon"
  );
}
