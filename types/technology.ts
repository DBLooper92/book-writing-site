import type { AppTimestamp } from "@/types/timestamp";

export const TECHNOLOGY_STATUS_VALUES = ["draft", "active", "archived"] as const;
export const TECHNOLOGY_CANON_LEVEL_VALUES = [
  "core",
  "working",
  "draft",
  "non_canon",
] as const;
export const TECHNOLOGY_CONFIDENCE_VALUES = [
  "low",
  "medium",
  "high",
  "confirmed",
] as const;

export type TechnologyStatus = (typeof TECHNOLOGY_STATUS_VALUES)[number];
export type TechnologyCanonLevel = (typeof TECHNOLOGY_CANON_LEVEL_VALUES)[number];
export type TechnologyConfidence = (typeof TECHNOLOGY_CONFIDENCE_VALUES)[number];
export type TechnologyTimestamp = AppTimestamp;

export type Technology = {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  status: TechnologyStatus;
  tags: string[];
  isArchived: boolean;
  canonLevel: TechnologyCanonLevel;
  confidence: TechnologyConfidence;
  technologyType: string;
  inventedYear: number | null;
  inventorNotes: string;
  powerSource: string;
  limitations: string[];
  associatedLocationIds: string[];
  associatedFactionIds: string[];
  timelineEventIds: string[];
  publicWikiSummary: string;
  createdAt: TechnologyTimestamp;
  updatedAt: TechnologyTimestamp;
};

export type TechnologyFormValues = {
  name: string;
  summary: string;
  description: string;
  status: TechnologyStatus;
  technologyType: string;
  inventedYear: string;
  inventorNotes: string;
  powerSource: string;
  limitations: string;
  associatedLocationIds: string;
  associatedFactionIds: string;
  timelineEventIds: string;
  publicWikiSummary: string;
};

export type NormalizedTechnologyFormValues = {
  name: string;
  summary: string;
  description: string;
  status: TechnologyStatus;
  technologyType: string;
  inventedYear: number | null;
  inventorNotes: string;
  powerSource: string;
  limitations: string[];
  associatedLocationIds: string[];
  associatedFactionIds: string[];
  timelineEventIds: string[];
  publicWikiSummary: string;
};

type BuildTechnologyDocumentInput = {
  id: string;
  projectId: string;
  values: NormalizedTechnologyFormValues;
};

export type TechnologyDocumentData = Omit<Technology, "createdAt" | "updatedAt">;

export const TECHNOLOGY_STATUS_OPTIONS: ReadonlyArray<{
  value: TechnologyStatus;
  label: string;
}> = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

const DEFAULT_TECHNOLOGY_STATUS: TechnologyStatus = "active";
const DEFAULT_TECHNOLOGY_CANON_LEVEL: TechnologyCanonLevel = "working";
const DEFAULT_TECHNOLOGY_CONFIDENCE: TechnologyConfidence = "medium";

export function createEmptyTechnologyFormValues(): TechnologyFormValues {
  return {
    name: "",
    summary: "",
    description: "",
    status: DEFAULT_TECHNOLOGY_STATUS,
    technologyType: "technology",
    inventedYear: "",
    inventorNotes: "",
    powerSource: "",
    limitations: "",
    associatedLocationIds: "",
    associatedFactionIds: "",
    timelineEventIds: "",
    publicWikiSummary: "",
  };
}

export function technologyToFormValues(technology: Technology): TechnologyFormValues {
  return {
    name: technology.name,
    summary: technology.summary,
    description: technology.description,
    status: technology.status,
    technologyType: technology.technologyType,
    inventedYear:
      typeof technology.inventedYear === "number" ? String(technology.inventedYear) : "",
    inventorNotes: technology.inventorNotes,
    powerSource: technology.powerSource,
    limitations: technology.limitations.join(", "),
    associatedLocationIds: technology.associatedLocationIds.join(", "),
    associatedFactionIds: technology.associatedFactionIds.join(", "),
    timelineEventIds: technology.timelineEventIds.join(", "),
    publicWikiSummary: technology.publicWikiSummary,
  };
}

export function normalizeTechnologyFormValues(
  values: TechnologyFormValues
): NormalizedTechnologyFormValues {
  return {
    name: values.name.trim(),
    summary: values.summary.trim(),
    description: values.description.trim(),
    status: coerceTechnologyStatus(values.status),
    technologyType: values.technologyType.trim() || "technology",
    inventedYear: parseIntegerOrNull(values.inventedYear),
    inventorNotes: values.inventorNotes.trim(),
    powerSource: values.powerSource.trim(),
    limitations: parseCommaSeparatedList(values.limitations),
    associatedLocationIds: parseCommaSeparatedList(values.associatedLocationIds),
    associatedFactionIds: parseCommaSeparatedList(values.associatedFactionIds),
    timelineEventIds: parseCommaSeparatedList(values.timelineEventIds),
    publicWikiSummary: values.publicWikiSummary.trim(),
  };
}

export function buildTechnologyDocument({
  id,
  projectId,
  values,
}: BuildTechnologyDocumentInput): TechnologyDocumentData {
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
    canonLevel: DEFAULT_TECHNOLOGY_CANON_LEVEL,
    confidence: DEFAULT_TECHNOLOGY_CONFIDENCE,
    technologyType: values.technologyType,
    inventedYear: values.inventedYear,
    inventorNotes: values.inventorNotes,
    powerSource: values.powerSource,
    limitations: values.limitations,
    associatedLocationIds: values.associatedLocationIds,
    associatedFactionIds: values.associatedFactionIds,
    timelineEventIds: values.timelineEventIds,
    publicWikiSummary: values.publicWikiSummary,
  };
}

export function coerceTechnologyStatus(value: unknown): TechnologyStatus {
  return isAllowedValue(TECHNOLOGY_STATUS_VALUES, value)
    ? value
    : DEFAULT_TECHNOLOGY_STATUS;
}

export function coerceTechnologyCanonLevel(value: unknown): TechnologyCanonLevel {
  return isAllowedValue(TECHNOLOGY_CANON_LEVEL_VALUES, value)
    ? value
    : DEFAULT_TECHNOLOGY_CANON_LEVEL;
}

export function coerceTechnologyConfidence(value: unknown): TechnologyConfidence {
  if (isAllowedValue(TECHNOLOGY_CONFIDENCE_VALUES, value)) {
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

  return DEFAULT_TECHNOLOGY_CONFIDENCE;
}

export function slugifyTechnologyName(value: string) {
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
      .replace(/^-+|-+$/g, "") || "technology"
  );
}
