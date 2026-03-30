import type { AppTimestamp } from "@/types/timestamp";

export const ATTACHMENT_STATUS_VALUES = [
  "draft",
  "active",
  "placeholder",
  "archived",
] as const;
export const ATTACHMENT_TYPE_VALUES = [
  "reference_note",
  "map",
  "diagram",
  "image",
  "document",
  "excerpt",
  "other",
] as const;
export const ATTACHMENT_STORAGE_STATUS_VALUES = [
  "not_uploaded",
  "uploaded",
  "external_link",
  "missing",
] as const;
export const ATTACHMENT_CANON_LEVEL_VALUES = [
  "core",
  "working",
  "draft",
  "non_canon",
] as const;
export const ATTACHMENT_CONFIDENCE_VALUES = [
  "low",
  "medium",
  "high",
  "confirmed",
] as const;

export type AttachmentStatus = (typeof ATTACHMENT_STATUS_VALUES)[number];
export type AttachmentType = (typeof ATTACHMENT_TYPE_VALUES)[number];
export type AttachmentStorageStatus = (typeof ATTACHMENT_STORAGE_STATUS_VALUES)[number];
export type AttachmentCanonLevel = (typeof ATTACHMENT_CANON_LEVEL_VALUES)[number];
export type AttachmentConfidence = (typeof ATTACHMENT_CONFIDENCE_VALUES)[number];
export type AttachmentTimestamp = AppTimestamp;

export type Attachment = {
  id: string;
  projectId: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  status: AttachmentStatus;
  tags: string[];
  isArchived: boolean;
  canonLevel: AttachmentCanonLevel;
  confidence: AttachmentConfidence;
  attachmentType: AttachmentType;
  storageStatus: AttachmentStorageStatus;
  fileName: string;
  mimeType: string;
  sourceNote: string;
  url: string | null;
  storageBucket: string | null;
  storagePath: string | null;
  fileSizeBytes: number | null;
  linkedEntityType: string | null;
  linkedEntityId: string | null;
  linkedNoteIds: string[];
  linkedOutlineIds: string[];
  createdAt: AttachmentTimestamp;
  updatedAt: AttachmentTimestamp;
};

export type AttachmentFormValues = {
  title: string;
  summary: string;
  description: string;
  status: AttachmentStatus;
  attachmentType: AttachmentType;
  storageStatus: AttachmentStorageStatus;
  fileName: string;
  mimeType: string;
  sourceNote: string;
  url: string;
  linkedEntityType: string;
  linkedEntityId: string;
  linkedNoteIds: string;
  linkedOutlineIds: string;
};

export type NormalizedAttachmentFormValues = {
  title: string;
  summary: string;
  description: string;
  status: AttachmentStatus;
  attachmentType: AttachmentType;
  storageStatus: AttachmentStorageStatus;
  fileName: string;
  mimeType: string;
  sourceNote: string;
  url: string | null;
  linkedEntityType: string | null;
  linkedEntityId: string | null;
  linkedNoteIds: string[];
  linkedOutlineIds: string[];
};

type BuildAttachmentDocumentInput = {
  id: string;
  projectId: string;
  values: NormalizedAttachmentFormValues;
};

export type AttachmentDocumentData = Omit<Attachment, "createdAt" | "updatedAt">;

export const ATTACHMENT_STATUS_OPTIONS: ReadonlyArray<{
  value: AttachmentStatus;
  label: string;
}> = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "placeholder", label: "Placeholder" },
  { value: "archived", label: "Archived" },
];

export const ATTACHMENT_TYPE_OPTIONS: ReadonlyArray<{
  value: AttachmentType;
  label: string;
}> = [
  { value: "reference_note", label: "Reference note" },
  { value: "map", label: "Map" },
  { value: "diagram", label: "Diagram" },
  { value: "image", label: "Image" },
  { value: "document", label: "Document" },
  { value: "excerpt", label: "Excerpt" },
  { value: "other", label: "Other" },
];

export const ATTACHMENT_STORAGE_STATUS_OPTIONS: ReadonlyArray<{
  value: AttachmentStorageStatus;
  label: string;
}> = [
  { value: "not_uploaded", label: "Not uploaded" },
  { value: "uploaded", label: "Uploaded" },
  { value: "external_link", label: "External link" },
  { value: "missing", label: "Missing" },
];

const DEFAULT_ATTACHMENT_STATUS: AttachmentStatus = "placeholder";
const DEFAULT_ATTACHMENT_TYPE: AttachmentType = "reference_note";
const DEFAULT_ATTACHMENT_STORAGE_STATUS: AttachmentStorageStatus = "not_uploaded";
const DEFAULT_ATTACHMENT_CANON_LEVEL: AttachmentCanonLevel = "working";
const DEFAULT_ATTACHMENT_CONFIDENCE: AttachmentConfidence = "medium";

export function createEmptyAttachmentFormValues(): AttachmentFormValues {
  return {
    title: "",
    summary: "",
    description: "",
    status: DEFAULT_ATTACHMENT_STATUS,
    attachmentType: DEFAULT_ATTACHMENT_TYPE,
    storageStatus: DEFAULT_ATTACHMENT_STORAGE_STATUS,
    fileName: "",
    mimeType: "",
    sourceNote: "",
    url: "",
    linkedEntityType: "",
    linkedEntityId: "",
    linkedNoteIds: "",
    linkedOutlineIds: "",
  };
}

export function attachmentToFormValues(attachment: Attachment): AttachmentFormValues {
  return {
    title: attachment.title,
    summary: attachment.summary,
    description: attachment.description,
    status: attachment.status,
    attachmentType: attachment.attachmentType,
    storageStatus: attachment.storageStatus,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    sourceNote: attachment.sourceNote,
    url: attachment.url ?? "",
    linkedEntityType: attachment.linkedEntityType ?? "",
    linkedEntityId: attachment.linkedEntityId ?? "",
    linkedNoteIds: attachment.linkedNoteIds.join(", "),
    linkedOutlineIds: attachment.linkedOutlineIds.join(", "),
  };
}

export function normalizeAttachmentFormValues(
  values: AttachmentFormValues
): NormalizedAttachmentFormValues {
  return {
    title: values.title.trim(),
    summary: values.summary.trim(),
    description: values.description.trim(),
    status: coerceAttachmentStatus(values.status),
    attachmentType: coerceAttachmentType(values.attachmentType),
    storageStatus: coerceAttachmentStorageStatus(values.storageStatus),
    fileName: values.fileName.trim(),
    mimeType: values.mimeType.trim(),
    sourceNote: values.sourceNote.trim(),
    url: values.url.trim() || null,
    linkedEntityType: values.linkedEntityType.trim() || null,
    linkedEntityId: values.linkedEntityId.trim() || null,
    linkedNoteIds: parseCommaSeparatedList(values.linkedNoteIds),
    linkedOutlineIds: parseCommaSeparatedList(values.linkedOutlineIds),
  };
}

export function buildAttachmentDocument({
  id,
  projectId,
  values,
}: BuildAttachmentDocumentInput): AttachmentDocumentData {
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
    canonLevel: DEFAULT_ATTACHMENT_CANON_LEVEL,
    confidence: DEFAULT_ATTACHMENT_CONFIDENCE,
    attachmentType: values.attachmentType,
    storageStatus: values.storageStatus,
    fileName: values.fileName,
    mimeType: values.mimeType,
    sourceNote: values.sourceNote,
    url: values.url,
    storageBucket: null,
    storagePath: null,
    fileSizeBytes: null,
    linkedEntityType: values.linkedEntityType,
    linkedEntityId: values.linkedEntityId,
    linkedNoteIds: values.linkedNoteIds,
    linkedOutlineIds: values.linkedOutlineIds,
  };
}

export function coerceAttachmentStatus(value: unknown): AttachmentStatus {
  if (isAllowedValue(ATTACHMENT_STATUS_VALUES, value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = normalizeEnumCandidate(value);

    if (isAllowedValue(ATTACHMENT_STATUS_VALUES, normalized)) {
      return normalized;
    }

    if (normalized === "planned" || normalized === "pending") {
      return "placeholder";
    }
  }

  return DEFAULT_ATTACHMENT_STATUS;
}

export function coerceAttachmentType(value: unknown): AttachmentType {
  if (isAllowedValue(ATTACHMENT_TYPE_VALUES, value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = normalizeEnumCandidate(value);

    if (isAllowedValue(ATTACHMENT_TYPE_VALUES, normalized)) {
      return normalized;
    }

    if (
      normalized === "reference" ||
      normalized === "reference_file" ||
      normalized === "reference_note"
    ) {
      return "reference_note";
    }

    if (normalized === "text" || normalized === "file") {
      return "document";
    }
  }

  return DEFAULT_ATTACHMENT_TYPE;
}

export function coerceAttachmentStorageStatus(value: unknown): AttachmentStorageStatus {
  if (isAllowedValue(ATTACHMENT_STORAGE_STATUS_VALUES, value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = normalizeEnumCandidate(value);

    if (isAllowedValue(ATTACHMENT_STORAGE_STATUS_VALUES, normalized)) {
      return normalized;
    }

    if (normalized === "notuploaded" || normalized === "unuploaded") {
      return "not_uploaded";
    }

    if (normalized === "external" || normalized === "linked") {
      return "external_link";
    }
  }

  return DEFAULT_ATTACHMENT_STORAGE_STATUS;
}

export function coerceAttachmentCanonLevel(value: unknown): AttachmentCanonLevel {
  return isAllowedValue(ATTACHMENT_CANON_LEVEL_VALUES, value)
    ? value
    : DEFAULT_ATTACHMENT_CANON_LEVEL;
}

export function coerceAttachmentConfidence(value: unknown): AttachmentConfidence {
  if (isAllowedValue(ATTACHMENT_CONFIDENCE_VALUES, value)) {
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

  return DEFAULT_ATTACHMENT_CONFIDENCE;
}

export function slugifyAttachmentTitle(value: string) {
  return slugify(value);
}

export function isStorageManagedAttachment(
  attachment: Pick<Attachment, "storageBucket" | "storagePath">
) {
  return Boolean(attachment.storageBucket && attachment.storagePath);
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
      .replace(/^-+|-+$/g, "") || "attachment"
  );
}
