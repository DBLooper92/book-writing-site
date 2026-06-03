import type { AppTimestamp } from "@/types/timestamp";

export const THEME_STATUS_VALUES = ["draft", "active", "archived"] as const;
export const THEME_CANON_LEVEL_VALUES = [
  "core",
  "working",
  "draft",
  "non_canon",
] as const;
export const THEME_CONFIDENCE_VALUES = [
  "low",
  "medium",
  "high",
  "confirmed",
] as const;

export type ThemeStatus = (typeof THEME_STATUS_VALUES)[number];
export type ThemeCanonLevel = (typeof THEME_CANON_LEVEL_VALUES)[number];
export type ThemeConfidence = (typeof THEME_CONFIDENCE_VALUES)[number];
export type ThemeTimestamp = AppTimestamp;

export type Theme = {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  status: ThemeStatus;
  tags: string[];
  isArchived: boolean;
  canonLevel: ThemeCanonLevel;
  confidence: ThemeConfidence;
  centralQuestion: string;
  associatedBookIds: string[];
  associatedCharacterIds: string[];
  associatedTimelineEventIds: string[];
  associatedEraIds: string[];
  associatedPlotThreadIds: string[];
  motifs: string[];
  publicWikiSummary: string;
  createdAt: ThemeTimestamp;
  updatedAt: ThemeTimestamp;
};

export type ThemeFormValues = {
  name: string;
  summary: string;
  description: string;
  status: ThemeStatus;
  centralQuestion: string;
  associatedBookIds: string;
  associatedCharacterIds: string;
  associatedTimelineEventIds: string;
  associatedEraIds: string;
  associatedPlotThreadIds: string;
  motifs: string;
  publicWikiSummary: string;
};

export type NormalizedThemeFormValues = {
  name: string;
  summary: string;
  description: string;
  status: ThemeStatus;
  centralQuestion: string;
  associatedBookIds: string[];
  associatedCharacterIds: string[];
  associatedTimelineEventIds: string[];
  associatedEraIds: string[];
  associatedPlotThreadIds: string[];
  motifs: string[];
  publicWikiSummary: string;
};

type BuildThemeDocumentInput = {
  id: string;
  projectId: string;
  values: NormalizedThemeFormValues;
};

export type ThemeDocumentData = Omit<Theme, "createdAt" | "updatedAt">;

export const THEME_STATUS_OPTIONS: ReadonlyArray<{
  value: ThemeStatus;
  label: string;
}> = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

const DEFAULT_THEME_STATUS: ThemeStatus = "active";
const DEFAULT_THEME_CANON_LEVEL: ThemeCanonLevel = "working";
const DEFAULT_THEME_CONFIDENCE: ThemeConfidence = "medium";

export function createEmptyThemeFormValues(): ThemeFormValues {
  return {
    name: "",
    summary: "",
    description: "",
    status: DEFAULT_THEME_STATUS,
    centralQuestion: "",
    associatedBookIds: "",
    associatedCharacterIds: "",
    associatedTimelineEventIds: "",
    associatedEraIds: "",
    associatedPlotThreadIds: "",
    motifs: "",
    publicWikiSummary: "",
  };
}

export function themeToFormValues(theme: Theme): ThemeFormValues {
  return {
    name: theme.name,
    summary: theme.summary,
    description: theme.description,
    status: theme.status,
    centralQuestion: theme.centralQuestion,
    associatedBookIds: theme.associatedBookIds.join(", "),
    associatedCharacterIds: theme.associatedCharacterIds.join(", "),
    associatedTimelineEventIds: theme.associatedTimelineEventIds.join(", "),
    associatedEraIds: theme.associatedEraIds.join(", "),
    associatedPlotThreadIds: theme.associatedPlotThreadIds.join(", "),
    motifs: theme.motifs.join(", "),
    publicWikiSummary: theme.publicWikiSummary,
  };
}

export function normalizeThemeFormValues(values: ThemeFormValues): NormalizedThemeFormValues {
  return {
    name: values.name.trim(),
    summary: values.summary.trim(),
    description: values.description.trim(),
    status: coerceThemeStatus(values.status),
    centralQuestion: values.centralQuestion.trim(),
    associatedBookIds: parseCommaSeparatedList(values.associatedBookIds),
    associatedCharacterIds: parseCommaSeparatedList(values.associatedCharacterIds),
    associatedTimelineEventIds: parseCommaSeparatedList(values.associatedTimelineEventIds),
    associatedEraIds: parseCommaSeparatedList(values.associatedEraIds),
    associatedPlotThreadIds: parseCommaSeparatedList(values.associatedPlotThreadIds),
    motifs: parseCommaSeparatedList(values.motifs),
    publicWikiSummary: values.publicWikiSummary.trim(),
  };
}

export function buildThemeDocument({
  id,
  projectId,
  values,
}: BuildThemeDocumentInput): ThemeDocumentData {
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
    canonLevel: DEFAULT_THEME_CANON_LEVEL,
    confidence: DEFAULT_THEME_CONFIDENCE,
    centralQuestion: values.centralQuestion,
    associatedBookIds: values.associatedBookIds,
    associatedCharacterIds: values.associatedCharacterIds,
    associatedTimelineEventIds: values.associatedTimelineEventIds,
    associatedEraIds: values.associatedEraIds,
    associatedPlotThreadIds: values.associatedPlotThreadIds,
    motifs: values.motifs,
    publicWikiSummary: values.publicWikiSummary,
  };
}

export function coerceThemeStatus(value: unknown): ThemeStatus {
  return isAllowedValue(THEME_STATUS_VALUES, value) ? value : DEFAULT_THEME_STATUS;
}

export function coerceThemeCanonLevel(value: unknown): ThemeCanonLevel {
  return isAllowedValue(THEME_CANON_LEVEL_VALUES, value) ? value : DEFAULT_THEME_CANON_LEVEL;
}

export function coerceThemeConfidence(value: unknown): ThemeConfidence {
  if (isAllowedValue(THEME_CONFIDENCE_VALUES, value)) {
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

  return DEFAULT_THEME_CONFIDENCE;
}

export function slugifyThemeName(value: string) {
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
      .replace(/^-+|-+$/g, "") || "theme"
  );
}
