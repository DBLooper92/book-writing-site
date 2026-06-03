import type { AppTimestamp } from "@/types/timestamp";

export const PLOT_THREAD_STATUS_VALUES = ["draft", "active", "archived"] as const;
export const PLOT_THREAD_CANON_LEVEL_VALUES = [
  "core",
  "working",
  "draft",
  "non_canon",
] as const;
export const PLOT_THREAD_CONFIDENCE_VALUES = [
  "low",
  "medium",
  "high",
  "confirmed",
] as const;
export const PLOT_THREAD_TYPE_VALUES = [
  "series_core",
  "book_arc",
  "character_arc",
  "mystery",
  "political",
  "romance",
  "quest",
  "subplot",
  "other",
] as const;

export type PlotThreadStatus = (typeof PLOT_THREAD_STATUS_VALUES)[number];
export type PlotThreadCanonLevel = (typeof PLOT_THREAD_CANON_LEVEL_VALUES)[number];
export type PlotThreadConfidence = (typeof PLOT_THREAD_CONFIDENCE_VALUES)[number];
export type PlotThreadType = (typeof PLOT_THREAD_TYPE_VALUES)[number];
export type PlotThreadTimestamp = AppTimestamp;

export type PlotThread = {
  id: string;
  projectId: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  status: PlotThreadStatus;
  tags: string[];
  isArchived: boolean;
  canonLevel: PlotThreadCanonLevel;
  confidence: PlotThreadConfidence;
  threadType: PlotThreadType;
  introducedInBookId: string | null;
  resolvedInBookId: string | null;
  characterIds: string[];
  timelineEventIds: string[];
  bookIds: string[];
  chapterIds: string[];
  sceneIds: string[];
  themeIds: string[];
  noteIds: string[];
  setupNotes: string[];
  payoffNotes: string[];
  openQuestions: string[];
  publicWikiSummary: string;
  createdAt: PlotThreadTimestamp;
  updatedAt: PlotThreadTimestamp;
};

export type PlotThreadFormValues = {
  title: string;
  summary: string;
  description: string;
  status: PlotThreadStatus;
  threadType: PlotThreadType;
  introducedInBookId: string;
  resolvedInBookId: string;
  characterIds: string;
  timelineEventIds: string;
  bookIds: string;
  chapterIds: string;
  setupNotes: string;
  payoffNotes: string;
  openQuestions: string;
  publicWikiSummary: string;
};

export type NormalizedPlotThreadFormValues = {
  title: string;
  summary: string;
  description: string;
  status: PlotThreadStatus;
  threadType: PlotThreadType;
  introducedInBookId: string | null;
  resolvedInBookId: string | null;
  characterIds: string[];
  timelineEventIds: string[];
  bookIds: string[];
  chapterIds: string[];
  setupNotes: string[];
  payoffNotes: string[];
  openQuestions: string[];
  publicWikiSummary: string;
};

type BuildPlotThreadDocumentInput = {
  id: string;
  projectId: string;
  values: NormalizedPlotThreadFormValues;
};

export type PlotThreadDocumentData = Omit<PlotThread, "createdAt" | "updatedAt">;

export const PLOT_THREAD_STATUS_OPTIONS: ReadonlyArray<{
  value: PlotThreadStatus;
  label: string;
}> = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

export const PLOT_THREAD_TYPE_OPTIONS: ReadonlyArray<{
  value: PlotThreadType;
  label: string;
}> = [
  { value: "series_core", label: "Series core" },
  { value: "book_arc", label: "Book arc" },
  { value: "character_arc", label: "Character arc" },
  { value: "mystery", label: "Mystery" },
  { value: "political", label: "Political" },
  { value: "romance", label: "Romance" },
  { value: "quest", label: "Quest" },
  { value: "subplot", label: "Subplot" },
  { value: "other", label: "Other" },
];

const DEFAULT_PLOT_THREAD_STATUS: PlotThreadStatus = "active";
const DEFAULT_PLOT_THREAD_CANON_LEVEL: PlotThreadCanonLevel = "working";
const DEFAULT_PLOT_THREAD_CONFIDENCE: PlotThreadConfidence = "medium";
const DEFAULT_PLOT_THREAD_TYPE: PlotThreadType = "subplot";

export function createEmptyPlotThreadFormValues(): PlotThreadFormValues {
  return {
    title: "",
    summary: "",
    description: "",
    status: DEFAULT_PLOT_THREAD_STATUS,
    threadType: DEFAULT_PLOT_THREAD_TYPE,
    introducedInBookId: "",
    resolvedInBookId: "",
    characterIds: "",
    timelineEventIds: "",
    bookIds: "",
    chapterIds: "",
    setupNotes: "",
    payoffNotes: "",
    openQuestions: "",
    publicWikiSummary: "",
  };
}

export function plotThreadToFormValues(plotThread: PlotThread): PlotThreadFormValues {
  return {
    title: plotThread.title,
    summary: plotThread.summary,
    description: plotThread.description,
    status: plotThread.status,
    threadType: plotThread.threadType,
    introducedInBookId: plotThread.introducedInBookId ?? "",
    resolvedInBookId: plotThread.resolvedInBookId ?? "",
    characterIds: plotThread.characterIds.join(", "),
    timelineEventIds: plotThread.timelineEventIds.join(", "),
    bookIds: plotThread.bookIds.join(", "),
    chapterIds: plotThread.chapterIds.join(", "),
    setupNotes: plotThread.setupNotes.join(", "),
    payoffNotes: plotThread.payoffNotes.join(", "),
    openQuestions: plotThread.openQuestions.join(", "),
    publicWikiSummary: plotThread.publicWikiSummary,
  };
}

export function normalizePlotThreadFormValues(
  values: PlotThreadFormValues
): NormalizedPlotThreadFormValues {
  return {
    title: values.title.trim(),
    summary: values.summary.trim(),
    description: values.description.trim(),
    status: coercePlotThreadStatus(values.status),
    threadType: coercePlotThreadType(values.threadType),
    introducedInBookId: values.introducedInBookId.trim() || null,
    resolvedInBookId: values.resolvedInBookId.trim() || null,
    characterIds: parseCommaSeparatedList(values.characterIds),
    timelineEventIds: parseCommaSeparatedList(values.timelineEventIds),
    bookIds: parseCommaSeparatedList(values.bookIds),
    chapterIds: parseCommaSeparatedList(values.chapterIds),
    setupNotes: parseCommaSeparatedList(values.setupNotes),
    payoffNotes: parseCommaSeparatedList(values.payoffNotes),
    openQuestions: parseCommaSeparatedList(values.openQuestions),
    publicWikiSummary: values.publicWikiSummary.trim(),
  };
}

export function buildPlotThreadDocument({
  id,
  projectId,
  values,
}: BuildPlotThreadDocumentInput): PlotThreadDocumentData {
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
    canonLevel: DEFAULT_PLOT_THREAD_CANON_LEVEL,
    confidence: DEFAULT_PLOT_THREAD_CONFIDENCE,
    threadType: values.threadType,
    introducedInBookId: values.introducedInBookId,
    resolvedInBookId: values.resolvedInBookId,
    characterIds: values.characterIds,
    timelineEventIds: values.timelineEventIds,
    bookIds: values.bookIds,
    chapterIds: values.chapterIds,
    sceneIds: [],
    themeIds: [],
    noteIds: [],
    setupNotes: values.setupNotes,
    payoffNotes: values.payoffNotes,
    openQuestions: values.openQuestions,
    publicWikiSummary: values.publicWikiSummary,
  };
}

export function coercePlotThreadStatus(value: unknown): PlotThreadStatus {
  return isAllowedValue(PLOT_THREAD_STATUS_VALUES, value)
    ? value
    : DEFAULT_PLOT_THREAD_STATUS;
}

export function coercePlotThreadCanonLevel(value: unknown): PlotThreadCanonLevel {
  return isAllowedValue(PLOT_THREAD_CANON_LEVEL_VALUES, value)
    ? value
    : DEFAULT_PLOT_THREAD_CANON_LEVEL;
}

export function coercePlotThreadConfidence(value: unknown): PlotThreadConfidence {
  if (isAllowedValue(PLOT_THREAD_CONFIDENCE_VALUES, value)) {
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

  return DEFAULT_PLOT_THREAD_CONFIDENCE;
}

export function coercePlotThreadType(value: unknown): PlotThreadType {
  if (isAllowedValue(PLOT_THREAD_TYPE_VALUES, value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = normalizeEnumCandidate(value);

    if (isAllowedValue(PLOT_THREAD_TYPE_VALUES, normalized)) {
      return normalized;
    }

    if (normalized === "series_core" || normalized === "series-core") {
      return "series_core";
    }

    if (normalized === "book" || normalized === "book_story") {
      return "book_arc";
    }

    if (normalized === "character" || normalized === "character_story") {
      return "character_arc";
    }
  }

  return DEFAULT_PLOT_THREAD_TYPE;
}

export function slugifyPlotThreadTitle(value: string) {
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
      .replace(/^-+|-+$/g, "") || "plot-thread"
  );
}
