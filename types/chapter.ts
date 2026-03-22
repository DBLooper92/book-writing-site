import type { AppTimestamp } from "@/types/timestamp";

export const CHAPTER_STATUS_VALUES = [
  "outline",
  "drafting",
  "revising",
  "complete",
  "archived",
] as const;
export const CHAPTER_CANON_LEVEL_VALUES = [
  "core",
  "working",
  "draft",
  "non_canon",
] as const;
export const CHAPTER_CONFIDENCE_VALUES = [
  "low",
  "medium",
  "high",
  "confirmed",
] as const;

export type ChapterStatus = (typeof CHAPTER_STATUS_VALUES)[number];
export type ChapterCanonLevel = (typeof CHAPTER_CANON_LEVEL_VALUES)[number];
export type ChapterConfidence = (typeof CHAPTER_CONFIDENCE_VALUES)[number];
export type ChapterTimestamp = AppTimestamp;

export type Chapter = {
  id: string;
  projectId: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  status: ChapterStatus;
  tags: string[];
  isArchived: boolean;
  canonLevel: ChapterCanonLevel;
  confidence: ChapterConfidence;
  bookId: string | null;
  chapterNumber: number | null;
  purpose: string;
  pointOfViewCharacterId: string | null;
  timelineEventIds: string[];
  sceneIds: string[];
  locationIds: string[];
  characterIds: string[];
  plotThreadIds: string[];
  foreshadows: string[];
  payoffs: string[];
  createdAt: ChapterTimestamp;
  updatedAt: ChapterTimestamp;
};

export type ChapterFormValues = {
  title: string;
  summary: string;
  description: string;
  status: ChapterStatus;
  bookId: string;
  chapterNumber: string;
  purpose: string;
  pointOfViewCharacterId: string;
};

export type NormalizedChapterFormValues = {
  title: string;
  summary: string;
  description: string;
  status: ChapterStatus;
  bookId: string | null;
  chapterNumber: number | null;
  purpose: string;
  pointOfViewCharacterId: string | null;
};

type BuildChapterDocumentInput = {
  id: string;
  projectId: string;
  values: NormalizedChapterFormValues;
};

export type ChapterDocumentData = Omit<Chapter, "createdAt" | "updatedAt">;

export const CHAPTER_STATUS_OPTIONS: ReadonlyArray<{
  value: ChapterStatus;
  label: string;
}> = [
  { value: "outline", label: "Outline" },
  { value: "drafting", label: "Drafting" },
  { value: "revising", label: "Revising" },
  { value: "complete", label: "Complete" },
  { value: "archived", label: "Archived" },
];

const DEFAULT_CHAPTER_STATUS: ChapterStatus = "outline";
const DEFAULT_CHAPTER_CANON_LEVEL: ChapterCanonLevel = "working";
const DEFAULT_CHAPTER_CONFIDENCE: ChapterConfidence = "medium";

export function createEmptyChapterFormValues(): ChapterFormValues {
  return {
    title: "",
    summary: "",
    description: "",
    status: DEFAULT_CHAPTER_STATUS,
    bookId: "",
    chapterNumber: "",
    purpose: "",
    pointOfViewCharacterId: "",
  };
}

export function chapterToFormValues(chapter: Chapter): ChapterFormValues {
  return {
    title: chapter.title,
    summary: chapter.summary,
    description: chapter.description,
    status: chapter.status,
    bookId: chapter.bookId ?? "",
    chapterNumber:
      typeof chapter.chapterNumber === "number" ? String(chapter.chapterNumber) : "",
    purpose: chapter.purpose,
    pointOfViewCharacterId: chapter.pointOfViewCharacterId ?? "",
  };
}

export function normalizeChapterFormValues(
  values: ChapterFormValues
): NormalizedChapterFormValues {
  return {
    title: values.title.trim(),
    summary: values.summary.trim(),
    description: values.description.trim(),
    status: coerceChapterStatus(values.status),
    bookId: values.bookId.trim() || null,
    chapterNumber: parseIntegerOrNull(values.chapterNumber),
    purpose: values.purpose.trim(),
    pointOfViewCharacterId: values.pointOfViewCharacterId.trim() || null,
  };
}

export function buildChapterDocument({
  id,
  projectId,
  values,
}: BuildChapterDocumentInput): ChapterDocumentData {
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
    canonLevel: DEFAULT_CHAPTER_CANON_LEVEL,
    confidence: DEFAULT_CHAPTER_CONFIDENCE,
    bookId: values.bookId,
    chapterNumber: values.chapterNumber,
    purpose: values.purpose,
    pointOfViewCharacterId: values.pointOfViewCharacterId,
    timelineEventIds: [],
    sceneIds: [],
    locationIds: [],
    characterIds: [],
    plotThreadIds: [],
    foreshadows: [],
    payoffs: [],
  };
}

export function coerceChapterStatus(value: unknown): ChapterStatus {
  if (isAllowedValue(CHAPTER_STATUS_VALUES, value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");

    if (normalized === "draft") {
      return "drafting";
    }

    if (normalized === "revision" || normalized === "revised") {
      return "revising";
    }

    if (normalized === "completed") {
      return "complete";
    }
  }

  return DEFAULT_CHAPTER_STATUS;
}

export function coerceChapterCanonLevel(value: unknown): ChapterCanonLevel {
  return isAllowedValue(CHAPTER_CANON_LEVEL_VALUES, value)
    ? value
    : DEFAULT_CHAPTER_CANON_LEVEL;
}

export function coerceChapterConfidence(value: unknown): ChapterConfidence {
  if (isAllowedValue(CHAPTER_CONFIDENCE_VALUES, value)) {
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
    const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");

    if (normalized === "core") {
      return "confirmed";
    }

    if (normalized === "uncertain") {
      return "low";
    }
  }

  return DEFAULT_CHAPTER_CONFIDENCE;
}

export function slugifyChapterTitle(value: string) {
  return slugify(value);
}

function isAllowedValue<const Values extends readonly string[]>(
  values: Values,
  value: unknown
): value is Values[number] {
  return typeof value === "string" && values.includes(value);
}

function parseIntegerOrNull(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "chapter"
  );
}
