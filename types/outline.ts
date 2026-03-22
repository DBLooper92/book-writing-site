import type { AppTimestamp } from "@/types/timestamp";

export const OUTLINE_STATUS_VALUES = ["draft", "active", "archived"] as const;
export const OUTLINE_CANON_LEVEL_VALUES = [
  "core",
  "working",
  "draft",
  "non_canon",
] as const;
export const OUTLINE_CONFIDENCE_VALUES = [
  "low",
  "medium",
  "high",
  "confirmed",
] as const;

export type OutlineStatus = (typeof OUTLINE_STATUS_VALUES)[number];
export type OutlineCanonLevel = (typeof OUTLINE_CANON_LEVEL_VALUES)[number];
export type OutlineConfidence = (typeof OUTLINE_CONFIDENCE_VALUES)[number];
export type OutlineTimestamp = AppTimestamp;

export type Outline = {
  id: string;
  projectId: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  status: OutlineStatus;
  tags: string[];
  isArchived: boolean;
  canonLevel: OutlineCanonLevel;
  confidence: OutlineConfidence;
  outlineType: string;
  scope: string;
  actStructure: string[];
  milestones: string[];
  bookIds: string[];
  threadIds: string[];
  noteIds: string[];
  createdAt: OutlineTimestamp;
  updatedAt: OutlineTimestamp;
};

export type OutlineFormValues = {
  title: string;
  summary: string;
  description: string;
  status: OutlineStatus;
  outlineType: string;
  scope: string;
  actStructure: string;
  milestones: string;
  bookIds: string;
  threadIds: string;
  noteIds: string;
};

export type NormalizedOutlineFormValues = {
  title: string;
  summary: string;
  description: string;
  status: OutlineStatus;
  outlineType: string;
  scope: string;
  actStructure: string[];
  milestones: string[];
  bookIds: string[];
  threadIds: string[];
  noteIds: string[];
};

type BuildOutlineDocumentInput = {
  id: string;
  projectId: string;
  values: NormalizedOutlineFormValues;
};

export type OutlineDocumentData = Omit<Outline, "createdAt" | "updatedAt">;

export const OUTLINE_STATUS_OPTIONS: ReadonlyArray<{
  value: OutlineStatus;
  label: string;
}> = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

const DEFAULT_OUTLINE_STATUS: OutlineStatus = "active";
const DEFAULT_OUTLINE_CANON_LEVEL: OutlineCanonLevel = "working";
const DEFAULT_OUTLINE_CONFIDENCE: OutlineConfidence = "medium";
const DEFAULT_OUTLINE_TYPE = "series";

export function createEmptyOutlineFormValues(): OutlineFormValues {
  return {
    title: "",
    summary: "",
    description: "",
    status: DEFAULT_OUTLINE_STATUS,
    outlineType: DEFAULT_OUTLINE_TYPE,
    scope: "",
    actStructure: "",
    milestones: "",
    bookIds: "",
    threadIds: "",
    noteIds: "",
  };
}

export function outlineToFormValues(outline: Outline): OutlineFormValues {
  return {
    title: outline.title,
    summary: outline.summary,
    description: outline.description,
    status: outline.status,
    outlineType: outline.outlineType,
    scope: outline.scope,
    actStructure: outline.actStructure.join(", "),
    milestones: outline.milestones.join(", "),
    bookIds: outline.bookIds.join(", "),
    threadIds: outline.threadIds.join(", "),
    noteIds: outline.noteIds.join(", "),
  };
}

export function normalizeOutlineFormValues(
  values: OutlineFormValues
): NormalizedOutlineFormValues {
  return {
    title: values.title.trim(),
    summary: values.summary.trim(),
    description: values.description.trim(),
    status: coerceOutlineStatus(values.status),
    outlineType: values.outlineType.trim() || DEFAULT_OUTLINE_TYPE,
    scope: values.scope.trim(),
    actStructure: parseCommaSeparatedList(values.actStructure),
    milestones: parseCommaSeparatedList(values.milestones),
    bookIds: parseCommaSeparatedList(values.bookIds),
    threadIds: parseCommaSeparatedList(values.threadIds),
    noteIds: parseCommaSeparatedList(values.noteIds),
  };
}

export function buildOutlineDocument({
  id,
  projectId,
  values,
}: BuildOutlineDocumentInput): OutlineDocumentData {
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
    canonLevel: DEFAULT_OUTLINE_CANON_LEVEL,
    confidence: DEFAULT_OUTLINE_CONFIDENCE,
    outlineType: values.outlineType,
    scope: values.scope,
    actStructure: values.actStructure,
    milestones: values.milestones,
    bookIds: values.bookIds,
    threadIds: values.threadIds,
    noteIds: values.noteIds,
  };
}

export function coerceOutlineStatus(value: unknown): OutlineStatus {
  return isAllowedValue(OUTLINE_STATUS_VALUES, value) ? value : DEFAULT_OUTLINE_STATUS;
}

export function coerceOutlineCanonLevel(value: unknown): OutlineCanonLevel {
  return isAllowedValue(OUTLINE_CANON_LEVEL_VALUES, value)
    ? value
    : DEFAULT_OUTLINE_CANON_LEVEL;
}

export function coerceOutlineConfidence(value: unknown): OutlineConfidence {
  if (isAllowedValue(OUTLINE_CONFIDENCE_VALUES, value)) {
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

  return DEFAULT_OUTLINE_CONFIDENCE;
}

export function slugifyOutlineTitle(value: string) {
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
      .replace(/^-+|-+$/g, "") || "outline"
  );
}
