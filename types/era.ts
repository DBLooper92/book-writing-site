import type { Timestamp } from "firebase/firestore";

export const ERA_STATUS_VALUES = ["draft", "active", "archived"] as const;
export const ERA_CANON_LEVEL_VALUES = [
  "core",
  "working",
  "draft",
  "non_canon",
] as const;
export const ERA_CONFIDENCE_VALUES = [
  "low",
  "medium",
  "high",
  "confirmed",
] as const;

export type EraStatus = (typeof ERA_STATUS_VALUES)[number];
export type EraCanonLevel = (typeof ERA_CANON_LEVEL_VALUES)[number];
export type EraConfidence = (typeof ERA_CONFIDENCE_VALUES)[number];
export type EraTimestamp = Timestamp | null;

export type Era = {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  status: EraStatus;
  tags: string[];
  isArchived: boolean;
  canonLevel: EraCanonLevel;
  confidence: EraConfidence;
  startYear: number | null;
  endYear: number | null;
  definingEvents: string[];
  keyLocations: string[];
  keyFactions: string[];
  dominantThemes: string[];
  publicWikiSummary: string;
  createdAt: EraTimestamp;
  updatedAt: EraTimestamp;
};

export type EraFormValues = {
  name: string;
  summary: string;
  description: string;
  status: EraStatus;
  startYear: string;
  endYear: string;
  definingEvents: string;
  keyLocations: string;
  keyFactions: string;
  dominantThemes: string;
  publicWikiSummary: string;
};

export type NormalizedEraFormValues = {
  name: string;
  summary: string;
  description: string;
  status: EraStatus;
  startYear: number | null;
  endYear: number | null;
  definingEvents: string[];
  keyLocations: string[];
  keyFactions: string[];
  dominantThemes: string[];
  publicWikiSummary: string;
};

type BuildEraDocumentInput = {
  id: string;
  projectId: string;
  values: NormalizedEraFormValues;
};

export type EraDocumentData = Omit<Era, "createdAt" | "updatedAt">;

export const ERA_STATUS_OPTIONS: ReadonlyArray<{
  value: EraStatus;
  label: string;
}> = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

const DEFAULT_ERA_STATUS: EraStatus = "active";
const DEFAULT_ERA_CANON_LEVEL: EraCanonLevel = "working";
const DEFAULT_ERA_CONFIDENCE: EraConfidence = "medium";

export function createEmptyEraFormValues(): EraFormValues {
  return {
    name: "",
    summary: "",
    description: "",
    status: DEFAULT_ERA_STATUS,
    startYear: "",
    endYear: "",
    definingEvents: "",
    keyLocations: "",
    keyFactions: "",
    dominantThemes: "",
    publicWikiSummary: "",
  };
}

export function eraToFormValues(era: Era): EraFormValues {
  return {
    name: era.name,
    summary: era.summary,
    description: era.description,
    status: era.status,
    startYear: typeof era.startYear === "number" ? String(era.startYear) : "",
    endYear: typeof era.endYear === "number" ? String(era.endYear) : "",
    definingEvents: era.definingEvents.join(", "),
    keyLocations: era.keyLocations.join(", "),
    keyFactions: era.keyFactions.join(", "),
    dominantThemes: era.dominantThemes.join(", "),
    publicWikiSummary: era.publicWikiSummary,
  };
}

export function normalizeEraFormValues(values: EraFormValues): NormalizedEraFormValues {
  return {
    name: values.name.trim(),
    summary: values.summary.trim(),
    description: values.description.trim(),
    status: coerceEraStatus(values.status),
    startYear: parseIntegerOrNull(values.startYear),
    endYear: parseIntegerOrNull(values.endYear),
    definingEvents: parseCommaSeparatedList(values.definingEvents),
    keyLocations: parseCommaSeparatedList(values.keyLocations),
    keyFactions: parseCommaSeparatedList(values.keyFactions),
    dominantThemes: parseCommaSeparatedList(values.dominantThemes),
    publicWikiSummary: values.publicWikiSummary.trim(),
  };
}

export function buildEraDocument({
  id,
  projectId,
  values,
}: BuildEraDocumentInput): EraDocumentData {
  return {
    id,
    projectId,
    name: values.name,
    slug: slugify(values.name),
    summary: values.summary,
    description: values.description,
    status: values.status,
    tags: [],
    isArchived: values.status === "archived",
    canonLevel: DEFAULT_ERA_CANON_LEVEL,
    confidence: DEFAULT_ERA_CONFIDENCE,
    startYear: values.startYear,
    endYear: values.endYear,
    definingEvents: values.definingEvents,
    keyLocations: values.keyLocations,
    keyFactions: values.keyFactions,
    dominantThemes: values.dominantThemes,
    publicWikiSummary: values.publicWikiSummary,
  };
}

export function coerceEraStatus(value: unknown): EraStatus {
  return isAllowedValue(ERA_STATUS_VALUES, value) ? value : DEFAULT_ERA_STATUS;
}

export function coerceEraCanonLevel(value: unknown): EraCanonLevel {
  return isAllowedValue(ERA_CANON_LEVEL_VALUES, value) ? value : DEFAULT_ERA_CANON_LEVEL;
}

export function coerceEraConfidence(value: unknown): EraConfidence {
  if (isAllowedValue(ERA_CONFIDENCE_VALUES, value)) {
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

  return DEFAULT_ERA_CONFIDENCE;
}

export function slugifyEraName(value: string) {
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
      .replace(/^-+|-+$/g, "") || "era"
  );
}
