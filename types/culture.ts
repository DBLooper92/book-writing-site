import type { AppTimestamp } from "@/types/timestamp";

export const CULTURE_STATUS_VALUES = ["draft", "active", "archived"] as const;
export const CULTURE_CANON_LEVEL_VALUES = [
  "core",
  "working",
  "draft",
  "non_canon",
] as const;
export const CULTURE_CONFIDENCE_VALUES = [
  "low",
  "medium",
  "high",
  "confirmed",
] as const;

export type CultureStatus = (typeof CULTURE_STATUS_VALUES)[number];
export type CultureCanonLevel = (typeof CULTURE_CANON_LEVEL_VALUES)[number];
export type CultureConfidence = (typeof CULTURE_CONFIDENCE_VALUES)[number];
export type CultureTimestamp = AppTimestamp;

export type Culture = {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  status: CultureStatus;
  tags: string[];
  isArchived: boolean;
  canonLevel: CultureCanonLevel;
  confidence: CultureConfidence;
  coreValues: string[];
  traditions: string[];
  associatedLocationIds: string[];
  languageIds: string[];
  religionIds: string[];
  factionIds: string[];
  eraIds: string[];
  publicWikiSummary: string;
  createdAt: CultureTimestamp;
  updatedAt: CultureTimestamp;
};

export type CultureFormValues = {
  name: string;
  summary: string;
  description: string;
  status: CultureStatus;
  coreValues: string;
  traditions: string;
  associatedLocationIds: string;
  languageIds: string;
  publicWikiSummary: string;
};

export type NormalizedCultureFormValues = {
  name: string;
  summary: string;
  description: string;
  status: CultureStatus;
  coreValues: string[];
  traditions: string[];
  associatedLocationIds: string[];
  languageIds: string[];
  publicWikiSummary: string;
};

type BuildCultureDocumentInput = {
  id: string;
  projectId: string;
  values: NormalizedCultureFormValues;
};

export type CultureDocumentData = Omit<Culture, "createdAt" | "updatedAt">;

export const CULTURE_STATUS_OPTIONS: ReadonlyArray<{
  value: CultureStatus;
  label: string;
}> = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

const DEFAULT_CULTURE_STATUS: CultureStatus = "active";
const DEFAULT_CULTURE_CANON_LEVEL: CultureCanonLevel = "working";
const DEFAULT_CULTURE_CONFIDENCE: CultureConfidence = "medium";

export function createEmptyCultureFormValues(): CultureFormValues {
  return {
    name: "",
    summary: "",
    description: "",
    status: DEFAULT_CULTURE_STATUS,
    coreValues: "",
    traditions: "",
    associatedLocationIds: "",
    languageIds: "",
    publicWikiSummary: "",
  };
}

export function cultureToFormValues(culture: Culture): CultureFormValues {
  return {
    name: culture.name,
    summary: culture.summary,
    description: culture.description,
    status: culture.status,
    coreValues: culture.coreValues.join(", "),
    traditions: culture.traditions.join(", "),
    associatedLocationIds: culture.associatedLocationIds.join(", "),
    languageIds: culture.languageIds.join(", "),
    publicWikiSummary: culture.publicWikiSummary,
  };
}

export function normalizeCultureFormValues(
  values: CultureFormValues
): NormalizedCultureFormValues {
  return {
    name: values.name.trim(),
    summary: values.summary.trim(),
    description: values.description.trim(),
    status: coerceCultureStatus(values.status),
    coreValues: parseCommaSeparatedList(values.coreValues),
    traditions: parseCommaSeparatedList(values.traditions),
    associatedLocationIds: parseCommaSeparatedList(values.associatedLocationIds),
    languageIds: parseCommaSeparatedList(values.languageIds),
    publicWikiSummary: values.publicWikiSummary.trim(),
  };
}

export function buildCultureDocument({
  id,
  projectId,
  values,
}: BuildCultureDocumentInput): CultureDocumentData {
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
    canonLevel: DEFAULT_CULTURE_CANON_LEVEL,
    confidence: DEFAULT_CULTURE_CONFIDENCE,
    coreValues: values.coreValues,
    traditions: values.traditions,
    associatedLocationIds: values.associatedLocationIds,
    languageIds: values.languageIds,
    religionIds: [],
    factionIds: [],
    eraIds: [],
    publicWikiSummary: values.publicWikiSummary,
  };
}

export function coerceCultureStatus(value: unknown): CultureStatus {
  return isAllowedValue(CULTURE_STATUS_VALUES, value) ? value : DEFAULT_CULTURE_STATUS;
}

export function coerceCultureCanonLevel(value: unknown): CultureCanonLevel {
  return isAllowedValue(CULTURE_CANON_LEVEL_VALUES, value)
    ? value
    : DEFAULT_CULTURE_CANON_LEVEL;
}

export function coerceCultureConfidence(value: unknown): CultureConfidence {
  if (isAllowedValue(CULTURE_CONFIDENCE_VALUES, value)) {
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

  return DEFAULT_CULTURE_CONFIDENCE;
}

export function slugifyCultureName(value: string) {
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
      .replace(/^-+|-+$/g, "") || "culture"
  );
}
