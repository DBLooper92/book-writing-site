import type { AppTimestamp } from "@/types/timestamp";

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
export type TimelineEventTimestamp = AppTimestamp;

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
  monthStart: number | null;
  dayStart: number | null;
  yearEnd: number | null;
  monthEnd: number | null;
  dayEnd: number | null;
  chronologyOrder: number | null;
  timeOfDayLabel: string;
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
  monthStart: string;
  dayStart: string;
  yearEnd: string;
  monthEnd: string;
  dayEnd: string;
  chronologyOrder: string;
  timeOfDayLabel: string;
  displayDateLabel: string;
  eraId: string;
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
  causes: string;
  consequences: string;
  predecessorEventIds: string[];
  successorEventIds: string[];
  publicWikiSummary: string;
};

export type NormalizedTimelineEventFormValues = {
  title: string;
  summary: string;
  description: string;
  status: TimelineEventStatus;
  eventType: TimelineEventType;
  yearStart: number | null;
  monthStart: number | null;
  dayStart: number | null;
  yearEnd: number | null;
  monthEnd: number | null;
  dayEnd: number | null;
  chronologyOrder: number | null;
  timeOfDayLabel: string;
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
};

export type TimelineEventValidationContext = {
  currentTimelineEventId?: string | null;
};

export type TimelineEventValidationResult = {
  errors: string[];
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
    monthStart: "",
    dayStart: "",
    yearEnd: "",
    monthEnd: "",
    dayEnd: "",
    chronologyOrder: "",
    timeOfDayLabel: "",
    displayDateLabel: "",
    eraId: "",
    bookIds: [],
    chapterIds: [],
    sceneIds: [],
    characterIds: [],
    locationIds: [],
    factionIds: [],
    cultureIds: [],
    technologyIds: [],
    religionIds: [],
    plotThreadIds: [],
    themeIds: [],
    causes: "",
    consequences: "",
    predecessorEventIds: [],
    successorEventIds: [],
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
    monthStart:
      typeof timelineEvent.monthStart === "number" ? String(timelineEvent.monthStart) : "",
    dayStart: typeof timelineEvent.dayStart === "number" ? String(timelineEvent.dayStart) : "",
    yearEnd: typeof timelineEvent.yearEnd === "number" ? String(timelineEvent.yearEnd) : "",
    monthEnd: typeof timelineEvent.monthEnd === "number" ? String(timelineEvent.monthEnd) : "",
    dayEnd: typeof timelineEvent.dayEnd === "number" ? String(timelineEvent.dayEnd) : "",
    chronologyOrder:
      typeof timelineEvent.chronologyOrder === "number"
        ? String(timelineEvent.chronologyOrder)
        : "",
    timeOfDayLabel: timelineEvent.timeOfDayLabel,
    displayDateLabel: timelineEvent.displayDateLabel,
    eraId: timelineEvent.eraId ?? "",
    bookIds: timelineEvent.bookIds,
    chapterIds: timelineEvent.chapterIds,
    sceneIds: timelineEvent.sceneIds,
    characterIds: timelineEvent.characterIds,
    locationIds: timelineEvent.locationIds,
    factionIds: timelineEvent.factionIds,
    cultureIds: timelineEvent.cultureIds,
    technologyIds: timelineEvent.technologyIds,
    religionIds: timelineEvent.religionIds,
    plotThreadIds: timelineEvent.plotThreadIds,
    themeIds: timelineEvent.themeIds,
    causes: timelineEvent.causes.join(", "),
    consequences: timelineEvent.consequences.join(", "),
    predecessorEventIds: timelineEvent.predecessorEventIds,
    successorEventIds: timelineEvent.successorEventIds,
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
    monthStart: parseIntegerOrNull(values.monthStart),
    dayStart: parseIntegerOrNull(values.dayStart),
    yearEnd: parseIntegerOrNull(values.yearEnd),
    monthEnd: parseIntegerOrNull(values.monthEnd),
    dayEnd: parseIntegerOrNull(values.dayEnd),
    chronologyOrder: parseIntegerOrNull(values.chronologyOrder),
    timeOfDayLabel: values.timeOfDayLabel.trim(),
    displayDateLabel: values.displayDateLabel.trim(),
    eraId: values.eraId.trim() || null,
    bookIds: normalizeSelectedIds(values.bookIds),
    chapterIds: normalizeSelectedIds(values.chapterIds),
    sceneIds: normalizeSelectedIds(values.sceneIds),
    characterIds: normalizeSelectedIds(values.characterIds),
    locationIds: normalizeSelectedIds(values.locationIds),
    factionIds: normalizeSelectedIds(values.factionIds),
    cultureIds: normalizeSelectedIds(values.cultureIds),
    technologyIds: normalizeSelectedIds(values.technologyIds),
    religionIds: normalizeSelectedIds(values.religionIds),
    plotThreadIds: normalizeSelectedIds(values.plotThreadIds),
    themeIds: normalizeSelectedIds(values.themeIds),
    causes: parseCommaSeparatedList(values.causes),
    consequences: parseCommaSeparatedList(values.consequences),
    predecessorEventIds: normalizeSelectedIds(values.predecessorEventIds),
    successorEventIds: normalizeSelectedIds(values.successorEventIds),
    publicWikiSummary: values.publicWikiSummary.trim(),
  };
}

export function validateNormalizedTimelineEventFormValues(
  values: NormalizedTimelineEventFormValues,
  context: TimelineEventValidationContext = {}
): TimelineEventValidationResult {
  const errors: string[] = [];

  if (!values.title.trim()) {
    errors.push("Timeline event title is required.");
  }

  if (
    typeof values.yearStart === "number" &&
    typeof values.yearEnd === "number" &&
    compareChronologyParts(
      values.yearStart,
      values.monthStart,
      values.dayStart,
      values.yearEnd,
      values.monthEnd,
      values.dayEnd
    ) > 0
  ) {
    errors.push("End date cannot be earlier than start date.");
  }

  if (!isMonthInRange(values.monthStart)) {
    errors.push("Start month must be between 1 and 12.");
  }

  if (!isMonthInRange(values.monthEnd)) {
    errors.push("End month must be between 1 and 12.");
  }

  if (!isDayInRange(values.dayStart)) {
    errors.push("Start day must be between 1 and 31.");
  }

  if (!isDayInRange(values.dayEnd)) {
    errors.push("End day must be between 1 and 31.");
  }

  if (values.monthStart !== null && values.yearStart === null) {
    errors.push("Start month requires a start year.");
  }

  if (values.dayStart !== null && values.monthStart === null) {
    errors.push("Start day requires a start month.");
  }

  if (values.monthEnd !== null && values.yearEnd === null) {
    errors.push("End month requires an end year.");
  }

  if (values.dayEnd !== null && values.monthEnd === null) {
    errors.push("End day requires an end month.");
  }

  if (values.chronologyOrder !== null && values.yearStart === null && values.yearEnd === null) {
    errors.push("Sequence within date requires at least a dated year placement.");
  }

  const currentTimelineEventId = context.currentTimelineEventId?.trim() ?? "";

  if (currentTimelineEventId) {
    if (values.predecessorEventIds.includes(currentTimelineEventId)) {
      errors.push("A timeline event cannot list itself as a predecessor.");
    }

    if (values.successorEventIds.includes(currentTimelineEventId)) {
      errors.push("A timeline event cannot list itself as a successor.");
    }
  }

  const overlappingContinuityIds = values.predecessorEventIds.filter((predecessorId) =>
    values.successorEventIds.includes(predecessorId)
  );

  if (overlappingContinuityIds.length > 0) {
    errors.push(
      `The same event cannot be both predecessor and successor: ${overlappingContinuityIds.join(
        ", "
      )}.`
    );
  }

  return { errors };
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
    monthStart: values.monthStart,
    dayStart: values.dayStart,
    yearEnd: values.yearEnd,
    monthEnd: values.monthEnd,
    dayEnd: values.dayEnd,
    chronologyOrder: values.chronologyOrder,
    timeOfDayLabel: values.timeOfDayLabel,
    displayDateLabel: values.displayDateLabel,
    eraId: values.eraId,
    bookIds: values.bookIds,
    chapterIds: values.chapterIds,
    sceneIds: values.sceneIds,
    characterIds: values.characterIds,
    locationIds: values.locationIds,
    factionIds: values.factionIds,
    cultureIds: values.cultureIds,
    technologyIds: values.technologyIds,
    religionIds: values.religionIds,
    plotThreadIds: values.plotThreadIds,
    themeIds: values.themeIds,
    causes: values.causes,
    consequences: values.consequences,
    predecessorEventIds: values.predecessorEventIds,
    successorEventIds: values.successorEventIds,
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
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function normalizeSelectedIds(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  );
}

function parseIntegerOrNull(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function isMonthInRange(value: number | null) {
  return value === null || (value >= 1 && value <= 12);
}

function isDayInRange(value: number | null) {
  return value === null || (value >= 1 && value <= 31);
}

function compareChronologyParts(
  leftYear: number | null,
  leftMonth: number | null,
  leftDay: number | null,
  rightYear: number | null,
  rightMonth: number | null,
  rightDay: number | null
) {
  const leftTuple = [leftYear, leftMonth, leftDay];
  const rightTuple = [rightYear, rightMonth, rightDay];

  for (let index = 0; index < leftTuple.length; index += 1) {
    const leftValue = leftTuple[index];
    const rightValue = rightTuple[index];

    if (leftValue === null || rightValue === null) {
      continue;
    }

    if (leftValue !== rightValue) {
      return leftValue - rightValue;
    }
  }

  return 0;
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
