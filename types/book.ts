import type { AppTimestamp } from "@/types/timestamp";

export const BOOK_STATUS_VALUES = [
  "planning",
  "drafting",
  "revising",
  "complete",
  "archived",
] as const;
export const BOOK_DRAFT_STAGE_VALUES = [
  "outline",
  "zero_draft",
  "first_draft",
  "revision",
  "final",
] as const;
export const BOOK_CANON_LEVEL_VALUES = [
  "core",
  "working",
  "draft",
  "non_canon",
] as const;
export const BOOK_CONFIDENCE_VALUES = [
  "low",
  "medium",
  "high",
  "confirmed",
] as const;

export type BookStatus = (typeof BOOK_STATUS_VALUES)[number];
export type BookDraftStage = (typeof BOOK_DRAFT_STAGE_VALUES)[number];
export type BookCanonLevel = (typeof BOOK_CANON_LEVEL_VALUES)[number];
export type BookConfidence = (typeof BOOK_CONFIDENCE_VALUES)[number];
export type BookTimestamp = AppTimestamp;

export type Book = {
  id: string;
  projectId: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  status: BookStatus;
  tags: string[];
  isArchived: boolean;
  canonLevel: BookCanonLevel;
  confidence: BookConfidence;
  seriesOrder: number | null;
  internalChronologyStart: number | null;
  internalChronologyEnd: number | null;
  premise: string;
  draftStage: BookDraftStage;
  wordCountTarget: number | null;
  wordCountCurrent: number;
  primaryThemes: string[];
  mainCharacters: string[];
  keyLocations: string[];
  relatedPlotThreads: string[];
  chapterIds: string[];
  sceneIds: string[];
  timelineEventIds: string[];
  publicWikiSummary: string;
  createdAt: BookTimestamp;
  updatedAt: BookTimestamp;
};

export type BookFormValues = {
  title: string;
  summary: string;
  description: string;
  status: BookStatus;
  seriesOrder: string;
  premise: string;
  draftStage: BookDraftStage;
  wordCountTarget: string;
  internalChronologyStart: string;
  internalChronologyEnd: string;
  publicWikiSummary: string;
};

export type NormalizedBookFormValues = {
  title: string;
  summary: string;
  description: string;
  status: BookStatus;
  seriesOrder: number | null;
  premise: string;
  draftStage: BookDraftStage;
  wordCountTarget: number | null;
  internalChronologyStart: number | null;
  internalChronologyEnd: number | null;
  publicWikiSummary: string;
};

type BuildBookDocumentInput = {
  id: string;
  projectId: string;
  values: NormalizedBookFormValues;
};

export type BookDocumentData = Omit<Book, "createdAt" | "updatedAt">;

export const BOOK_STATUS_OPTIONS: ReadonlyArray<{
  value: BookStatus;
  label: string;
}> = [
  { value: "planning", label: "Planning" },
  { value: "drafting", label: "Drafting" },
  { value: "revising", label: "Revising" },
  { value: "complete", label: "Complete" },
  { value: "archived", label: "Archived" },
];

export const BOOK_DRAFT_STAGE_OPTIONS: ReadonlyArray<{
  value: BookDraftStage;
  label: string;
}> = [
  { value: "outline", label: "Outline" },
  { value: "zero_draft", label: "Zero draft" },
  { value: "first_draft", label: "First draft" },
  { value: "revision", label: "Revision" },
  { value: "final", label: "Final" },
];

const DEFAULT_BOOK_STATUS: BookStatus = "planning";
const DEFAULT_BOOK_DRAFT_STAGE: BookDraftStage = "outline";
const DEFAULT_BOOK_CANON_LEVEL: BookCanonLevel = "working";
const DEFAULT_BOOK_CONFIDENCE: BookConfidence = "medium";

export function createEmptyBookFormValues(): BookFormValues {
  return {
    title: "",
    summary: "",
    description: "",
    status: DEFAULT_BOOK_STATUS,
    seriesOrder: "",
    premise: "",
    draftStage: DEFAULT_BOOK_DRAFT_STAGE,
    wordCountTarget: "",
    internalChronologyStart: "",
    internalChronologyEnd: "",
    publicWikiSummary: "",
  };
}

export function bookToFormValues(book: Book): BookFormValues {
  return {
    title: book.title,
    summary: book.summary,
    description: book.description,
    status: book.status,
    seriesOrder: typeof book.seriesOrder === "number" ? String(book.seriesOrder) : "",
    premise: book.premise,
    draftStage: book.draftStage,
    wordCountTarget:
      typeof book.wordCountTarget === "number" ? String(book.wordCountTarget) : "",
    internalChronologyStart:
      typeof book.internalChronologyStart === "number"
        ? String(book.internalChronologyStart)
        : "",
    internalChronologyEnd:
      typeof book.internalChronologyEnd === "number"
        ? String(book.internalChronologyEnd)
        : "",
    publicWikiSummary: book.publicWikiSummary,
  };
}

export function normalizeBookFormValues(
  values: BookFormValues
): NormalizedBookFormValues {
  return {
    title: values.title.trim(),
    summary: values.summary.trim(),
    description: values.description.trim(),
    status: coerceBookStatus(values.status),
    seriesOrder: parseIntegerOrNull(values.seriesOrder),
    premise: values.premise.trim(),
    draftStage: coerceBookDraftStage(values.draftStage),
    wordCountTarget: parseIntegerOrNull(values.wordCountTarget),
    internalChronologyStart: parseIntegerOrNull(values.internalChronologyStart),
    internalChronologyEnd: parseIntegerOrNull(values.internalChronologyEnd),
    publicWikiSummary: values.publicWikiSummary.trim(),
  };
}

export function buildBookDocument({
  id,
  projectId,
  values,
}: BuildBookDocumentInput): BookDocumentData {
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
    canonLevel: DEFAULT_BOOK_CANON_LEVEL,
    confidence: DEFAULT_BOOK_CONFIDENCE,
    seriesOrder: values.seriesOrder,
    internalChronologyStart: values.internalChronologyStart,
    internalChronologyEnd: values.internalChronologyEnd,
    premise: values.premise,
    draftStage: values.draftStage,
    wordCountTarget: values.wordCountTarget,
    wordCountCurrent: 0,
    primaryThemes: [],
    mainCharacters: [],
    keyLocations: [],
    relatedPlotThreads: [],
    chapterIds: [],
    sceneIds: [],
    timelineEventIds: [],
    publicWikiSummary: values.publicWikiSummary,
  };
}

export function coerceBookStatus(value: unknown): BookStatus {
  if (isAllowedValue(BOOK_STATUS_VALUES, value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");

    if (normalized === "draft") {
      return "drafting";
    }

    if (normalized === "completed") {
      return "complete";
    }
  }

  return DEFAULT_BOOK_STATUS;
}

export function coerceBookDraftStage(value: unknown): BookDraftStage {
  if (isAllowedValue(BOOK_DRAFT_STAGE_VALUES, value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");

    if (normalized === "draft") {
      return "first_draft";
    }

    if (normalized === "revising") {
      return "revision";
    }
  }

  return DEFAULT_BOOK_DRAFT_STAGE;
}

export function coerceBookCanonLevel(value: unknown): BookCanonLevel {
  return isAllowedValue(BOOK_CANON_LEVEL_VALUES, value)
    ? value
    : DEFAULT_BOOK_CANON_LEVEL;
}

export function coerceBookConfidence(value: unknown): BookConfidence {
  if (isAllowedValue(BOOK_CONFIDENCE_VALUES, value)) {
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

  return DEFAULT_BOOK_CONFIDENCE;
}

export function slugifyBookTitle(value: string) {
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
      .replace(/^-+|-+$/g, "") || "book"
  );
}
