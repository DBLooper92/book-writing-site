import type { AppTimestamp } from "@/types/timestamp";

export const GLOSSARY_TERM_STATUS_VALUES = ["draft", "active", "archived"] as const;
export const GLOSSARY_TERM_CANON_LEVEL_VALUES = [
  "core",
  "working",
  "draft",
  "non_canon",
] as const;
export const GLOSSARY_TERM_CONFIDENCE_VALUES = [
  "low",
  "medium",
  "high",
  "confirmed",
] as const;

export type GlossaryTermStatus = (typeof GLOSSARY_TERM_STATUS_VALUES)[number];
export type GlossaryTermCanonLevel = (typeof GLOSSARY_TERM_CANON_LEVEL_VALUES)[number];
export type GlossaryTermConfidence = (typeof GLOSSARY_TERM_CONFIDENCE_VALUES)[number];
export type GlossaryTermTimestamp = AppTimestamp;

export type GlossaryTerm = {
  id: string;
  projectId: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  status: GlossaryTermStatus;
  tags: string[];
  isArchived: boolean;
  canonLevel: GlossaryTermCanonLevel;
  confidence: GlossaryTermConfidence;
  term: string;
  definition: string;
  category: string;
  relatedEntityTypes: string[];
  relatedEntityIds: string[];
  publicWikiSummary: string;
  createdAt: GlossaryTermTimestamp;
  updatedAt: GlossaryTermTimestamp;
};

export type GlossaryTermFormValues = {
  title: string;
  summary: string;
  description: string;
  status: GlossaryTermStatus;
  term: string;
  definition: string;
  category: string;
  relatedEntityTypes: string;
  relatedEntityIds: string;
  publicWikiSummary: string;
};

export type NormalizedGlossaryTermFormValues = {
  title: string;
  summary: string;
  description: string;
  status: GlossaryTermStatus;
  term: string;
  definition: string;
  category: string;
  relatedEntityTypes: string[];
  relatedEntityIds: string[];
  publicWikiSummary: string;
};

type BuildGlossaryTermDocumentInput = {
  id: string;
  projectId: string;
  values: NormalizedGlossaryTermFormValues;
};

export type GlossaryTermDocumentData = Omit<GlossaryTerm, "createdAt" | "updatedAt">;

export const GLOSSARY_TERM_STATUS_OPTIONS: ReadonlyArray<{
  value: GlossaryTermStatus;
  label: string;
}> = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

const DEFAULT_GLOSSARY_TERM_STATUS: GlossaryTermStatus = "active";
const DEFAULT_GLOSSARY_TERM_CANON_LEVEL: GlossaryTermCanonLevel = "working";
const DEFAULT_GLOSSARY_TERM_CONFIDENCE: GlossaryTermConfidence = "medium";

export function createEmptyGlossaryTermFormValues(): GlossaryTermFormValues {
  return {
    title: "",
    summary: "",
    description: "",
    status: DEFAULT_GLOSSARY_TERM_STATUS,
    term: "",
    definition: "",
    category: "",
    relatedEntityTypes: "",
    relatedEntityIds: "",
    publicWikiSummary: "",
  };
}

export function glossaryTermToFormValues(
  glossaryTerm: GlossaryTerm
): GlossaryTermFormValues {
  return {
    title: glossaryTerm.title,
    summary: glossaryTerm.summary,
    description: glossaryTerm.description,
    status: glossaryTerm.status,
    term: glossaryTerm.term,
    definition: glossaryTerm.definition,
    category: glossaryTerm.category,
    relatedEntityTypes: glossaryTerm.relatedEntityTypes.join(", "),
    relatedEntityIds: glossaryTerm.relatedEntityIds.join(", "),
    publicWikiSummary: glossaryTerm.publicWikiSummary,
  };
}

export function normalizeGlossaryTermFormValues(
  values: GlossaryTermFormValues
): NormalizedGlossaryTermFormValues {
  const title = values.title.trim();
  const term = values.term.trim() || title;

  return {
    title,
    summary: values.summary.trim(),
    description: values.description.trim(),
    status: coerceGlossaryTermStatus(values.status),
    term,
    definition: values.definition.trim(),
    category: values.category.trim(),
    relatedEntityTypes: parseCommaSeparatedList(values.relatedEntityTypes),
    relatedEntityIds: parseCommaSeparatedList(values.relatedEntityIds),
    publicWikiSummary: values.publicWikiSummary.trim(),
  };
}

export function buildGlossaryTermDocument({
  id,
  projectId,
  values,
}: BuildGlossaryTermDocumentInput): GlossaryTermDocumentData {
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
    canonLevel: DEFAULT_GLOSSARY_TERM_CANON_LEVEL,
    confidence: DEFAULT_GLOSSARY_TERM_CONFIDENCE,
    term: values.term,
    definition: values.definition,
    category: values.category,
    relatedEntityTypes: values.relatedEntityTypes,
    relatedEntityIds: values.relatedEntityIds,
    publicWikiSummary: values.publicWikiSummary,
  };
}

export function coerceGlossaryTermStatus(value: unknown): GlossaryTermStatus {
  return isAllowedValue(GLOSSARY_TERM_STATUS_VALUES, value)
    ? value
    : DEFAULT_GLOSSARY_TERM_STATUS;
}

export function coerceGlossaryTermCanonLevel(value: unknown): GlossaryTermCanonLevel {
  return isAllowedValue(GLOSSARY_TERM_CANON_LEVEL_VALUES, value)
    ? value
    : DEFAULT_GLOSSARY_TERM_CANON_LEVEL;
}

export function coerceGlossaryTermConfidence(value: unknown): GlossaryTermConfidence {
  if (isAllowedValue(GLOSSARY_TERM_CONFIDENCE_VALUES, value)) {
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

  return DEFAULT_GLOSSARY_TERM_CONFIDENCE;
}

export function slugifyGlossaryTermTitle(value: string) {
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
      .replace(/^-+|-+$/g, "") || "glossary-term"
  );
}
