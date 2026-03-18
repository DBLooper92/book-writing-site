import type { Timestamp } from "firebase/firestore";

export const TIMELINE_EVENT_STATUS_VALUES = ["draft", "active", "archived"] as const;
export const TIMELINE_EVENT_CANON_LEVEL_VALUES = [
  "core",
  "working",
  "draft",
  "non_canon",
] as const;
export const TIMELINE_EVENT_CONFIDENCE_VALUES = [
  "low",
  "medium",
  "high",
  "confirmed",
] as const;
export const TIMELINE_EVENT_TYPE_VALUES = [
  "inciting_incident",
  "discovery",
  "revelation",
  "conflict",
  "turning_point",
  "aftermath",
  "travel",
  "political",
  "personal",
  "world_event",
  "other",
] as const;

export type TimelineEventStatus = (typeof TIMELINE_EVENT_STATUS_VALUES)[number];
export type TimelineEventCanonLevel = (typeof TIMELINE_EVENT_CANON_LEVEL_VALUES)[number];
export type TimelineEventConfidence = (typeof TIMELINE_EVENT_CONFIDENCE_VALUES)[number];
export type TimelineEventType = (typeof TIMELINE_EVENT_TYPE_VALUES)[number];
export type TimelineEventTimestamp = Timestamp | null;

export type TimelineEvent = {
  id: string;
  projectId: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  status: TimelineEventStatus;
  tags: string[];
  isArchived: boolean;
  canonLevel: TimelineEventCanonLevel;
  confidence: TimelineEventConfidence;
  eventType: TimelineEventType;
  yearStart: number | null;
  yearEnd: number | null;
  displayDateLabel: string;
  eraId: string | null;
  bookIds: string[];
  chapterIds: string[];
  sceneIds: string[];
  characterIds: string[];
  locationIds: string[];
  factionIds: string[];
  cultureIds: string[];
  technologyIds: string[];
  religionIds: string[];
  plotThreadIds: string[];
  themeIds: string[];
  causes: string[];
  consequences: string[];
  predecessorEventIds: string[];
  successorEventIds: string[];
  publicWikiSummary: string;
  createdAt: TimelineEventTimestamp;
  updatedAt: TimelineEventTimestamp;
};

export type TimelineEventFormValues = {
  title: string;
  summary: string;
  description: string;
  status: TimelineEventStatus;
  eventType: TimelineEventType;
  yearStart: string;
  yearEnd: string;
  displayDateLabel: string;
  eraId: string;
  bookIds: string;
  chapterIds: string;
  sceneIds: string;
  characterIds: string;
  locationIds: string;
  causes: string;
  consequences: string;
  publicWikiSummary: string;
};

export type NormalizedTimelineEventFormValues = {
  title: string;
  summary: string;
  description: string;
  status: TimelineEventStatus;
  eventType: TimelineEventType;
  yearStart: number | null;
  yearEnd: number | null;
  displayDateLabel: string;
  eraId: string | null;
  bookIds: string[];
  chapterIds: string[];
  sceneIds: string[];
  characterIds: string[];
  locationIds: string[];
  causes: string[];
  consequences: string[];
  publicWikiSummary: string;
};

type BuildTimelineEventDocumentInput = {
  id: string;
  projectId: string;
  values: NormalizedTimelineEventFormValues;
};

export type TimelineEventDocumentData = Omit<TimelineEvent, "createdAt" | "updatedAt">;

export const TIMELINE_EVENT_STATUS_OPTIONS: ReadonlyArray<{
  value: TimelineEventStatus;
  label: string;
}> = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

export const TIMELINE_EVENT_TYPE_OPTIONS: ReadonlyArray<{
  value: TimelineEventType;
  label: string;
}> = [
  { value: "inciting_incident", label: "Inciting incident" },
  { value: "discovery", label: "Discovery" },
  { value: "revelation", label: "Revelation" },
  { value: "conflict", label: "Conflict" },
  { value: "turning_point", label: "Turning point" },
  { value: "aftermath", label: "Aftermath" },
  { value: "travel", label: "Travel" },
  { value: "political", label: "Political" },
  { value: "personal", label: "Personal" },
  { value: "world_event", label: "World event" },
  { value: "other", label: "Other" },
];

const DEFAULT_TIMELINE_EVENT_STATUS: TimelineEventStatus = "active";
const DEFAULT_TIMELINE_EVENT_CANON_LEVEL: TimelineEventCanonLevel = "working";
const DEFAULT_TIMELINE_EVENT_CONFIDENCE: TimelineEventConfidence = "medium";
const DEFAULT_TIMELINE_EVENT_TYPE: TimelineEventType = "other";

export function createEmptyTimelineEventFormValues(): TimelineEventFormValues {
  return {
    title: "",
    summary: "",
    description: "",
    status: DEFAULT_TIMELINE_EVENT_STATUS,
    eventType: DEFAULT_TIMELINE_EVENT_TYPE,
    yearStart: "",
    yearEnd: "",
    displayDateLabel: "",
    eraId: "",
    bookIds: "",
    chapterIds: "",
    sceneIds: "",
    characterIds: "",
    locationIds: "",
    causes: "",
    consequences: "",
    publicWikiSummary: "",
  };
}

export function timelineEventToFormValues(
  timelineEvent: TimelineEvent
): TimelineEventFormValues {
  return {
    title: timelineEvent.title,
    summary: timelineEvent.summary,
    description: timelineEvent.description,
    status: timelineEvent.status,
    eventType: timelineEvent.eventType,
    yearStart:
      typeof timelineEvent.yearStart === "number" ? String(timelineEvent.yearStart) : "",
    yearEnd: typeof timelineEvent.yearEnd === "number" ? String(timelineEvent.yearEnd) : "",
    displayDateLabel: timelineEvent.displayDateLabel,
    eraId: timelineEvent.eraId ?? "",
    bookIds: timelineEvent.bookIds.join(", "),
    chapterIds: timelineEvent.chapterIds.join(", "),
    sceneIds: timelineEvent.sceneIds.join(", "),
    characterIds: timelineEvent.characterIds.join(", "),
    locationIds: timelineEvent.locationIds.join(", "),
    causes: timelineEvent.causes.join(", "),
    consequences: timelineEvent.consequences.join(", "),
    publicWikiSummary: timelineEvent.publicWikiSummary,
  };
}

export function normalizeTimelineEventFormValues(
  values: TimelineEventFormValues
): NormalizedTimelineEventFormValues {
  return {
    title: values.title.trim(),
    summary: values.summary.trim(),
    description: values.description.trim(),
    status: coerceTimelineEventStatus(values.status),
    eventType: coerceTimelineEventType(values.eventType),
    yearStart: parseIntegerOrNull(values.yearStart),
    yearEnd: parseIntegerOrNull(values.yearEnd),
    displayDateLabel: values.displayDateLabel.trim(),
    eraId: values.eraId.trim() || null,
    bookIds: parseCommaSeparatedList(values.bookIds),
    chapterIds: parseCommaSeparatedList(values.chapterIds),
    sceneIds: parseCommaSeparatedList(values.sceneIds),
    characterIds: parseCommaSeparatedList(values.characterIds),
    locationIds: parseCommaSeparatedList(values.locationIds),
    causes: parseCommaSeparatedList(values.causes),
    consequences: parseCommaSeparatedList(values.consequences),
    publicWikiSummary: values.publicWikiSummary.trim(),
  };
}

export function buildTimelineEventDocument({
  id,
  projectId,
  values,
}: BuildTimelineEventDocumentInput): TimelineEventDocumentData {
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
    canonLevel: DEFAULT_TIMELINE_EVENT_CANON_LEVEL,
    confidence: DEFAULT_TIMELINE_EVENT_CONFIDENCE,
    eventType: values.eventType,
    yearStart: values.yearStart,
    yearEnd: values.yearEnd,
    displayDateLabel: values.displayDateLabel,
    eraId: values.eraId,
    bookIds: values.bookIds,
    chapterIds: values.chapterIds,
    sceneIds: values.sceneIds,
    characterIds: values.characterIds,
    locationIds: values.locationIds,
    factionIds: [],
    cultureIds: [],
    technologyIds: [],
    religionIds: [],
    plotThreadIds: [],
    themeIds: [],
    causes: values.causes,
    consequences: values.consequences,
    predecessorEventIds: [],
    successorEventIds: [],
    publicWikiSummary: values.publicWikiSummary,
  };
}

export function coerceTimelineEventStatus(value: unknown): TimelineEventStatus {
  return isAllowedValue(TIMELINE_EVENT_STATUS_VALUES, value)
    ? value
    : DEFAULT_TIMELINE_EVENT_STATUS;
}

export function coerceTimelineEventCanonLevel(value: unknown): TimelineEventCanonLevel {
  return isAllowedValue(TIMELINE_EVENT_CANON_LEVEL_VALUES, value)
    ? value
    : DEFAULT_TIMELINE_EVENT_CANON_LEVEL;
}

export function coerceTimelineEventConfidence(value: unknown): TimelineEventConfidence {
  if (isAllowedValue(TIMELINE_EVENT_CONFIDENCE_VALUES, value)) {
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

  return DEFAULT_TIMELINE_EVENT_CONFIDENCE;
}

export function coerceTimelineEventType(value: unknown): TimelineEventType {
  if (isAllowedValue(TIMELINE_EVENT_TYPE_VALUES, value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = normalizeEnumCandidate(value);

    if (isAllowedValue(TIMELINE_EVENT_TYPE_VALUES, normalized)) {
      return normalized;
    }

    if (normalized === "incident") {
      return "inciting_incident";
    }

    if (normalized === "battle") {
      return "conflict";
    }

    if (normalized === "climax") {
      return "turning_point";
    }
  }

  return DEFAULT_TIMELINE_EVENT_TYPE;
}

export function slugifyTimelineEventTitle(value: string) {
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

function parseIntegerOrNull(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
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
      .replace(/^-+|-+$/g, "") || "timeline-event"
  );
}
