import type { AppTimestamp } from "@/types/timestamp";

export const NOTE_STATUS_VALUES = ["draft", "active", "archived"] as const;
export const NOTE_CANON_LEVEL_VALUES = [
  "core",
  "working",
  "draft",
  "non_canon",
] as const;
export const NOTE_CONFIDENCE_VALUES = [
  "low",
  "medium",
  "high",
  "confirmed",
] as const;

export type NoteStatus = (typeof NOTE_STATUS_VALUES)[number];
export type NoteCanonLevel = (typeof NOTE_CANON_LEVEL_VALUES)[number];
export type NoteConfidence = (typeof NOTE_CONFIDENCE_VALUES)[number];
export type NoteTimestamp = AppTimestamp;

export type Note = {
  id: string;
  projectId: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  status: NoteStatus;
  tags: string[];
  isArchived: boolean;
  canonLevel: NoteCanonLevel;
  confidence: NoteConfidence;
  content: string;
  noteType: string;
  linkedEntityType: string | null;
  linkedEntityId: string | null;
  linkedBookIds: string[];
  linkedChapterIds: string[];
  linkedCharacterIds: string[];
  linkedLocationIds: string[];
  linkedEventIds: string[];
  linkedThreadIds: string[];
  createdAt: NoteTimestamp;
  updatedAt: NoteTimestamp;
};

export type NoteFormValues = {
  title: string;
  summary: string;
  description: string;
  content: string;
  status: NoteStatus;
  noteType: string;
  linkedEntityType: string;
  linkedEntityId: string;
};

export type NormalizedNoteFormValues = {
  title: string;
  summary: string;
  description: string;
  content: string;
  status: NoteStatus;
  noteType: string;
  linkedEntityType: string | null;
  linkedEntityId: string | null;
};

type BuildNoteDocumentInput = {
  id: string;
  projectId: string;
  values: NormalizedNoteFormValues;
};

export type NoteDocumentData = Omit<Note, "createdAt" | "updatedAt">;

export const NOTE_STATUS_OPTIONS: ReadonlyArray<{
  value: NoteStatus;
  label: string;
}> = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

const DEFAULT_NOTE_STATUS: NoteStatus = "active";
const DEFAULT_NOTE_CANON_LEVEL: NoteCanonLevel = "working";
const DEFAULT_NOTE_CONFIDENCE: NoteConfidence = "medium";
const DEFAULT_NOTE_TYPE = "general";

export function createEmptyNoteFormValues(): NoteFormValues {
  return {
    title: "",
    summary: "",
    description: "",
    content: "",
    status: DEFAULT_NOTE_STATUS,
    noteType: DEFAULT_NOTE_TYPE,
    linkedEntityType: "",
    linkedEntityId: "",
  };
}

export function noteToFormValues(note: Note): NoteFormValues {
  return {
    title: note.title,
    summary: note.summary,
    description: note.description,
    content: note.content,
    status: note.status,
    noteType: note.noteType,
    linkedEntityType: note.linkedEntityType ?? "",
    linkedEntityId: note.linkedEntityId ?? "",
  };
}

export function normalizeNoteFormValues(
  values: NoteFormValues
): NormalizedNoteFormValues {
  return {
    title: values.title.trim(),
    summary: values.summary.trim(),
    description: values.description.trim(),
    content: values.content.trim(),
    status: coerceNoteStatus(values.status),
    noteType: values.noteType.trim() || DEFAULT_NOTE_TYPE,
    linkedEntityType: values.linkedEntityType.trim() || null,
    linkedEntityId: values.linkedEntityId.trim() || null,
  };
}

export function buildNoteDocument({
  id,
  projectId,
  values,
}: BuildNoteDocumentInput): NoteDocumentData {
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
    canonLevel: DEFAULT_NOTE_CANON_LEVEL,
    confidence: DEFAULT_NOTE_CONFIDENCE,
    content: values.content,
    noteType: values.noteType,
    linkedEntityType: values.linkedEntityType,
    linkedEntityId: values.linkedEntityId,
    linkedBookIds: [],
    linkedChapterIds: [],
    linkedCharacterIds: [],
    linkedLocationIds: [],
    linkedEventIds: [],
    linkedThreadIds: [],
  };
}

export function coerceNoteStatus(value: unknown): NoteStatus {
  return isAllowedValue(NOTE_STATUS_VALUES, value) ? value : DEFAULT_NOTE_STATUS;
}

export function coerceNoteCanonLevel(value: unknown): NoteCanonLevel {
  return isAllowedValue(NOTE_CANON_LEVEL_VALUES, value)
    ? value
    : DEFAULT_NOTE_CANON_LEVEL;
}

export function coerceNoteConfidence(value: unknown): NoteConfidence {
  if (isAllowedValue(NOTE_CONFIDENCE_VALUES, value)) {
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

  return DEFAULT_NOTE_CONFIDENCE;
}

export function slugifyNoteTitle(value: string) {
  return slugify(value);
}

function isAllowedValue<const Values extends readonly string[]>(
  values: Values,
  value: unknown
): value is Values[number] {
  return typeof value === "string" && values.includes(value);
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "note"
  );
}
