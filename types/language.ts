import type { AppTimestamp } from "@/types/timestamp";

export const LANGUAGE_STATUS_VALUES = ["draft", "active", "archived"] as const;
export const LANGUAGE_CANON_LEVEL_VALUES = [
  "core",
  "working",
  "draft",
  "non_canon",
] as const;
export const LANGUAGE_CONFIDENCE_VALUES = [
  "low",
  "medium",
  "high",
  "confirmed",
] as const;

export type LanguageStatus = (typeof LANGUAGE_STATUS_VALUES)[number];
export type LanguageCanonLevel = (typeof LANGUAGE_CANON_LEVEL_VALUES)[number];
export type LanguageConfidence = (typeof LANGUAGE_CONFIDENCE_VALUES)[number];
export type LanguageTimestamp = AppTimestamp;

export type Language = {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  status: LanguageStatus;
  tags: string[];
  isArchived: boolean;
  canonLevel: LanguageCanonLevel;
  confidence: LanguageConfidence;
  languageFamily: string;
  writingSystem: string;
  primaryRegions: string[];
  dialects: string[];
  loanSources: string[];
  publicWikiSummary: string;
  createdAt: LanguageTimestamp;
  updatedAt: LanguageTimestamp;
};

export type LanguageFormValues = {
  name: string;
  summary: string;
  description: string;
  status: LanguageStatus;
  languageFamily: string;
  writingSystem: string;
  primaryRegions: string;
  dialects: string;
  loanSources: string;
  publicWikiSummary: string;
};

export type NormalizedLanguageFormValues = {
  name: string;
  summary: string;
  description: string;
  status: LanguageStatus;
  languageFamily: string;
  writingSystem: string;
  primaryRegions: string[];
  dialects: string[];
  loanSources: string[];
  publicWikiSummary: string;
};

type BuildLanguageDocumentInput = {
  id: string;
  projectId: string;
  values: NormalizedLanguageFormValues;
};

export type LanguageDocumentData = Omit<Language, "createdAt" | "updatedAt">;

export const LANGUAGE_STATUS_OPTIONS: ReadonlyArray<{
  value: LanguageStatus;
  label: string;
}> = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

const DEFAULT_LANGUAGE_STATUS: LanguageStatus = "active";
const DEFAULT_LANGUAGE_CANON_LEVEL: LanguageCanonLevel = "working";
const DEFAULT_LANGUAGE_CONFIDENCE: LanguageConfidence = "medium";

export function createEmptyLanguageFormValues(): LanguageFormValues {
  return {
    name: "",
    summary: "",
    description: "",
    status: DEFAULT_LANGUAGE_STATUS,
    languageFamily: "",
    writingSystem: "",
    primaryRegions: "",
    dialects: "",
    loanSources: "",
    publicWikiSummary: "",
  };
}

export function languageToFormValues(language: Language): LanguageFormValues {
  return {
    name: language.name,
    summary: language.summary,
    description: language.description,
    status: language.status,
    languageFamily: language.languageFamily,
    writingSystem: language.writingSystem,
    primaryRegions: language.primaryRegions.join(", "),
    dialects: language.dialects.join(", "),
    loanSources: language.loanSources.join(", "),
    publicWikiSummary: language.publicWikiSummary,
  };
}

export function normalizeLanguageFormValues(
  values: LanguageFormValues
): NormalizedLanguageFormValues {
  return {
    name: values.name.trim(),
    summary: values.summary.trim(),
    description: values.description.trim(),
    status: coerceLanguageStatus(values.status),
    languageFamily: values.languageFamily.trim(),
    writingSystem: values.writingSystem.trim(),
    primaryRegions: parseCommaSeparatedList(values.primaryRegions),
    dialects: parseCommaSeparatedList(values.dialects),
    loanSources: parseCommaSeparatedList(values.loanSources),
    publicWikiSummary: values.publicWikiSummary.trim(),
  };
}

export function buildLanguageDocument({
  id,
  projectId,
  values,
}: BuildLanguageDocumentInput): LanguageDocumentData {
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
    canonLevel: DEFAULT_LANGUAGE_CANON_LEVEL,
    confidence: DEFAULT_LANGUAGE_CONFIDENCE,
    languageFamily: values.languageFamily,
    writingSystem: values.writingSystem,
    primaryRegions: values.primaryRegions,
    dialects: values.dialects,
    loanSources: values.loanSources,
    publicWikiSummary: values.publicWikiSummary,
  };
}

export function coerceLanguageStatus(value: unknown): LanguageStatus {
  return isAllowedValue(LANGUAGE_STATUS_VALUES, value) ? value : DEFAULT_LANGUAGE_STATUS;
}

export function coerceLanguageCanonLevel(value: unknown): LanguageCanonLevel {
  return isAllowedValue(LANGUAGE_CANON_LEVEL_VALUES, value)
    ? value
    : DEFAULT_LANGUAGE_CANON_LEVEL;
}

export function coerceLanguageConfidence(value: unknown): LanguageConfidence {
  if (isAllowedValue(LANGUAGE_CONFIDENCE_VALUES, value)) {
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

  return DEFAULT_LANGUAGE_CONFIDENCE;
}

export function slugifyLanguageName(value: string) {
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
      .replace(/^-+|-+$/g, "") || "language"
  );
}
