import { getTimelineReferenceIssues, type TimelineReferenceSets } from "@/lib/timeline/references";
import {
  TIMELINE_EVENT_STATUS_OPTIONS,
  TIMELINE_EVENT_TYPE_OPTIONS,
  type TimelineEvent,
  type TimelineEventStatus,
  type TimelineEventType,
} from "@/types/timeline-event";

export type TimelineWorkspaceStatusFilter = "all" | TimelineEventStatus;
export type TimelineWorkspaceTypeFilter = "all" | TimelineEventType;
export type TimelineWorkspaceDatingFilter = "all" | "dated" | "undated";
export type TimelineWorkspaceLinkScopeFilter =
  | "all"
  | "manuscript"
  | "characters"
  | "locations"
  | "worldbuilding"
  | "continuity";

export type TimelineWorkspaceFilters = {
  search: string;
  status: TimelineWorkspaceStatusFilter;
  eventType: TimelineWorkspaceTypeFilter;
  dating: TimelineWorkspaceDatingFilter;
  linkScope: TimelineWorkspaceLinkScopeFilter;
};

export type TimelineWorkspaceYearGroup = {
  anchorYear: number;
  label: string;
  events: TimelineEvent[];
};

export type TimelineWorkspaceIssue = {
  severity: "warning";
  message: string;
};

export type TimelineWorkspaceStats = {
  totalEvents: number;
  visibleEvents: number;
  datedEvents: number;
  undatedEvents: number;
  archivedEvents: number;
  continuityLinkedEvents: number;
  earliestVisibleYear: number | null;
  latestVisibleYear: number | null;
};

export type TimelineWorkspaceModel = {
  filteredEvents: TimelineEvent[];
  datedGroups: TimelineWorkspaceYearGroup[];
  undatedEvents: TimelineEvent[];
  stats: TimelineWorkspaceStats;
};

export const TIMELINE_WORKSPACE_STATUS_OPTIONS: ReadonlyArray<{
  value: TimelineWorkspaceStatusFilter;
  label: string;
}> = [{ value: "all", label: "All statuses" }, ...TIMELINE_EVENT_STATUS_OPTIONS];

export const TIMELINE_WORKSPACE_TYPE_OPTIONS: ReadonlyArray<{
  value: TimelineWorkspaceTypeFilter;
  label: string;
}> = [{ value: "all", label: "All event types" }, ...TIMELINE_EVENT_TYPE_OPTIONS];

export const TIMELINE_WORKSPACE_DATING_OPTIONS: ReadonlyArray<{
  value: TimelineWorkspaceDatingFilter;
  label: string;
}> = [
  { value: "all", label: "All chronology coverage" },
  { value: "dated", label: "Dated events only" },
  { value: "undated", label: "Undated events only" },
];

export const TIMELINE_WORKSPACE_LINK_SCOPE_OPTIONS: ReadonlyArray<{
  value: TimelineWorkspaceLinkScopeFilter;
  label: string;
}> = [
  { value: "all", label: "All link coverage" },
  { value: "manuscript", label: "Manuscript-linked" },
  { value: "characters", label: "Character-linked" },
  { value: "locations", label: "Location-linked" },
  { value: "worldbuilding", label: "Worldbuilding-linked" },
  { value: "continuity", label: "Continuity-linked" },
];

export function createEmptyTimelineWorkspaceFilters(): TimelineWorkspaceFilters {
  return {
    search: "",
    status: "all",
    eventType: "all",
    dating: "all",
    linkScope: "all",
  };
}

export function hasActiveTimelineWorkspaceFilters(filters: TimelineWorkspaceFilters) {
  return (
    filters.search.trim().length > 0 ||
    filters.status !== "all" ||
    filters.eventType !== "all" ||
    filters.dating !== "all" ||
    filters.linkScope !== "all"
  );
}

export function buildTimelineWorkspaceModel(
  timelineEvents: TimelineEvent[],
  filters: TimelineWorkspaceFilters
): TimelineWorkspaceModel {
  const sortedTimelineEvents = sortTimelineEvents(timelineEvents);
  const filteredEvents = sortedTimelineEvents.filter((timelineEvent) =>
    matchesTimelineWorkspaceFilters(timelineEvent, filters)
  );
  const datedGroups = buildTimelineWorkspaceYearGroups(filteredEvents);
  const undatedEvents = filteredEvents.filter(
    (timelineEvent) => getTimelineEventAnchorYear(timelineEvent) === null
  );
  const visibleAnchorYears = filteredEvents
    .map((timelineEvent) => getTimelineEventAnchorYear(timelineEvent))
    .filter((anchorYear): anchorYear is number => typeof anchorYear === "number");

  return {
    filteredEvents,
    datedGroups,
    undatedEvents,
    stats: {
      totalEvents: sortedTimelineEvents.length,
      visibleEvents: filteredEvents.length,
      datedEvents: datedGroups.reduce((total, group) => total + group.events.length, 0),
      undatedEvents: undatedEvents.length,
      archivedEvents: sortedTimelineEvents.filter(
        (timelineEvent) => timelineEvent.isArchived
      ).length,
      continuityLinkedEvents: sortedTimelineEvents.filter(hasTimelineContinuityLinks).length,
      earliestVisibleYear:
        visibleAnchorYears.length > 0 ? Math.min(...visibleAnchorYears) : null,
      latestVisibleYear: visibleAnchorYears.length > 0 ? Math.max(...visibleAnchorYears) : null,
    },
  };
}

export function sortTimelineEvents(timelineEvents: TimelineEvent[]) {
  const baseSortedTimelineEvents = [...timelineEvents].sort(compareTimelineEvents);
  return reorderTimelineEventsWithinAnchorGroups(baseSortedTimelineEvents);
}

export function compareTimelineEvents(left: TimelineEvent, right: TimelineEvent) {
  const startYearComparison = compareNullablePrecisionValue(left.yearStart, right.yearStart);

  if (startYearComparison !== 0) {
    return startYearComparison;
  }

  const insertionComparison = compareTimelineEventAdjacency(left, right);

  if (insertionComparison !== 0) {
    return insertionComparison;
  }

  const startMonthComparison = compareNullablePrecisionValue(left.monthStart, right.monthStart);

  if (startMonthComparison !== 0) {
    return startMonthComparison;
  }

  const startDayComparison = compareNullablePrecisionValue(left.dayStart, right.dayStart);

  if (startDayComparison !== 0) {
    return startDayComparison;
  }

  const orderComparison = compareNullablePrecisionValue(
    left.chronologyOrder,
    right.chronologyOrder
  );

  if (orderComparison !== 0) {
    return orderComparison;
  }

  const endComparison = compareTimelineEventDates(
    left.yearEnd,
    left.monthEnd,
    left.dayEnd,
    right.yearEnd,
    right.monthEnd,
    right.dayEnd
  );

  if (endComparison !== 0) {
    return endComparison;
  }

  return left.title.localeCompare(right.title);
}

export function formatTimelineEventRange(
  yearStart: number | null,
  yearEnd: number | null
) {
  if (typeof yearStart === "number" && typeof yearEnd === "number") {
    return yearStart === yearEnd ? String(yearStart) : `${yearStart}-${yearEnd}`;
  }

  if (typeof yearStart === "number") {
    return `From ${yearStart}`;
  }

  if (typeof yearEnd === "number") {
    return `Until ${yearEnd}`;
  }

  return "Undated";
}

export function formatDetailedTimelineEventRange(timelineEvent: TimelineEvent) {
  const startLabel = formatTimelineEventBoundaryLabel(timelineEvent, "start");
  const endLabel = formatTimelineEventBoundaryLabel(timelineEvent, "end");

  if (startLabel && endLabel) {
    return appendTimeOfDayLabel(
      startLabel === endLabel ? startLabel : `${startLabel} to ${endLabel}`,
      timelineEvent.timeOfDayLabel
    );
  }

  if (startLabel) {
    return appendTimeOfDayLabel(`From ${startLabel}`, timelineEvent.timeOfDayLabel);
  }

  if (endLabel) {
    return appendTimeOfDayLabel(`Until ${endLabel}`, timelineEvent.timeOfDayLabel);
  }

  if (timelineEvent.timeOfDayLabel.trim()) {
    return timelineEvent.timeOfDayLabel.trim();
  }

  return "Undated";
}

export function formatTimelineEventSequenceLabel(timelineEvent: TimelineEvent) {
  return typeof timelineEvent.chronologyOrder === "number"
    ? `Sequence ${timelineEvent.chronologyOrder}`
    : null;
}

export function formatTimelineEventBoundaryLabel(
  timelineEvent: TimelineEvent,
  boundary: "start" | "end"
) {
  return boundary === "start"
    ? formatPartialTimelineDate(
        timelineEvent.yearStart,
        timelineEvent.monthStart,
        timelineEvent.dayStart
      )
    : formatPartialTimelineDate(
        timelineEvent.yearEnd,
        timelineEvent.monthEnd,
        timelineEvent.dayEnd
      );
}

export function formatTimelineEnumValue(value: string) {
  if (!value) {
    return "Unknown";
  }

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function getTimelineEventChronologyLabel(timelineEvent: TimelineEvent) {
  return timelineEvent.displayDateLabel || formatDetailedTimelineEventRange(timelineEvent);
}

export function getTimelineEventAnchorYear(timelineEvent: TimelineEvent) {
  if (typeof timelineEvent.yearStart === "number") {
    return timelineEvent.yearStart;
  }

  if (typeof timelineEvent.yearEnd === "number") {
    return timelineEvent.yearEnd;
  }

  return null;
}

export function hasTimelineContinuityLinks(timelineEvent: TimelineEvent) {
  return (
    timelineEvent.predecessorEventIds.length > 0 ||
    timelineEvent.successorEventIds.length > 0
  );
}

export function getTimelineWorkspaceIssues(
  timelineEvent: TimelineEvent,
  knownTimelineEventIds: ReadonlySet<string>,
  referenceSets?: TimelineReferenceSets | null
): TimelineWorkspaceIssue[] {
  const issues: TimelineWorkspaceIssue[] = [];

  if (timelineEvent.predecessorEventIds.includes(timelineEvent.id)) {
    issues.push({
      severity: "warning",
      message: "This event lists itself as a predecessor.",
    });
  }

  if (timelineEvent.successorEventIds.includes(timelineEvent.id)) {
    issues.push({
      severity: "warning",
      message: "This event lists itself as a successor.",
    });
  }

  if (
    hasInvalidTimelineEventDateRange(timelineEvent)
  ) {
    issues.push({
      severity: "warning",
      message: "End date is earlier than start date.",
    });
  }

  const missingPredecessors = timelineEvent.predecessorEventIds.filter(
    (eventId) => !knownTimelineEventIds.has(eventId)
  );

  if (missingPredecessors.length > 0) {
    issues.push({
      severity: "warning",
      message: `Missing predecessor IDs: ${missingPredecessors.join(", ")}.`,
    });
  }

  const missingSuccessors = timelineEvent.successorEventIds.filter(
    (eventId) => !knownTimelineEventIds.has(eventId)
  );

  if (missingSuccessors.length > 0) {
    issues.push({
      severity: "warning",
      message: `Missing successor IDs: ${missingSuccessors.join(", ")}.`,
    });
  }

  const overlappingContinuityIds = timelineEvent.predecessorEventIds.filter((eventId) =>
    timelineEvent.successorEventIds.includes(eventId)
  );

  if (overlappingContinuityIds.length > 0) {
    issues.push({
      severity: "warning",
      message: `IDs appear in both predecessor and successor lists: ${overlappingContinuityIds.join(", ")}.`,
    });
  }

  if (referenceSets) {
    getTimelineReferenceIssues(timelineEvent, referenceSets).forEach((message) => {
      issues.push({
        severity: "warning",
        message,
      });
    });
  }

  return issues;
}

function buildTimelineWorkspaceYearGroups(
  timelineEvents: TimelineEvent[]
): TimelineWorkspaceYearGroup[] {
  const groups = new Map<number, TimelineEvent[]>();

  for (const timelineEvent of timelineEvents) {
    const anchorYear = getTimelineEventAnchorYear(timelineEvent);

    if (typeof anchorYear !== "number") {
      continue;
    }

    const existingGroup = groups.get(anchorYear) ?? [];
    existingGroup.push(timelineEvent);
    groups.set(anchorYear, existingGroup);
  }

  return Array.from(groups.entries())
    .sort(([leftYear], [rightYear]) => leftYear - rightYear)
    .map(([anchorYear, events]) => ({
      anchorYear,
      label: String(anchorYear),
      events,
    }));
}

function hasInvalidTimelineEventDateRange(timelineEvent: TimelineEvent) {
  return (
    typeof timelineEvent.yearStart === "number" &&
    typeof timelineEvent.yearEnd === "number" &&
    compareTimelineEventDates(
      timelineEvent.yearStart,
      timelineEvent.monthStart,
      timelineEvent.dayStart,
      timelineEvent.yearEnd,
      timelineEvent.monthEnd,
      timelineEvent.dayEnd
    ) > 0
  );
}

function compareTimelineEventDates(
  leftYear: number | null,
  leftMonth: number | null,
  leftDay: number | null,
  rightYear: number | null,
  rightMonth: number | null,
  rightDay: number | null
) {
  const yearComparison = compareNullablePrecisionValue(leftYear, rightYear);

  if (yearComparison !== 0) {
    return yearComparison;
  }

  const monthComparison = compareNullablePrecisionValue(leftMonth, rightMonth);

  if (monthComparison !== 0) {
    return monthComparison;
  }

  return compareNullablePrecisionValue(leftDay, rightDay);
}

function compareNullablePrecisionValue(left: number | null, right: number | null) {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  if (typeof left === "number") {
    return 1;
  }

  if (typeof right === "number") {
    return -1;
  }

  return 0;
}

function compareTimelineEventAdjacency(left: TimelineEvent, right: TimelineEvent) {
  const leftBeforeRight =
    left.successorEventIds.includes(right.id) || right.predecessorEventIds.includes(left.id);
  const leftAfterRight =
    left.predecessorEventIds.includes(right.id) || right.successorEventIds.includes(left.id);

  if (leftBeforeRight === leftAfterRight) {
    return 0;
  }

  return leftBeforeRight ? -1 : 1;
}

function reorderTimelineEventsWithinAnchorGroups(timelineEvents: TimelineEvent[]) {
  if (timelineEvents.length < 2) {
    return timelineEvents;
  }

  const orderedTimelineEvents: TimelineEvent[] = [];
  let currentGroup: TimelineEvent[] = [];
  let currentAnchorKey: string | null = null;

  for (const timelineEvent of timelineEvents) {
    const anchorKey = getTimelineAnchorGroupKey(timelineEvent);

    if (currentGroup.length === 0 || anchorKey === currentAnchorKey) {
      currentGroup.push(timelineEvent);
      currentAnchorKey = anchorKey;
      continue;
    }

    orderedTimelineEvents.push(...resolveTimelineAdjacencyOrder(currentGroup));
    currentGroup = [timelineEvent];
    currentAnchorKey = anchorKey;
  }

  if (currentGroup.length > 0) {
    orderedTimelineEvents.push(...resolveTimelineAdjacencyOrder(currentGroup));
  }

  return orderedTimelineEvents;
}

function resolveTimelineAdjacencyOrder(timelineEvents: TimelineEvent[]) {
  if (timelineEvents.length < 2) {
    return timelineEvents;
  }

  const timelineEventById = new Map(
    timelineEvents.map((timelineEvent) => [timelineEvent.id, timelineEvent])
  );
  const baseIndexById = new Map(
    timelineEvents.map((timelineEvent, index) => [timelineEvent.id, index])
  );
  const indegreeById = new Map(timelineEvents.map((timelineEvent) => [timelineEvent.id, 0]));
  const adjacencyById = new Map(timelineEvents.map((timelineEvent) => [timelineEvent.id, new Set<string>()]));

  for (const timelineEvent of timelineEvents) {
    for (const predecessorId of timelineEvent.predecessorEventIds) {
      addTimelineAdjacencyEdge(
        adjacencyById,
        indegreeById,
        predecessorId,
        timelineEvent.id,
        timelineEventById
      );
    }

    for (const successorId of timelineEvent.successorEventIds) {
      addTimelineAdjacencyEdge(
        adjacencyById,
        indegreeById,
        timelineEvent.id,
        successorId,
        timelineEventById
      );
    }
  }

  const readyIds = timelineEvents
    .filter((timelineEvent) => (indegreeById.get(timelineEvent.id) ?? 0) === 0)
    .map((timelineEvent) => timelineEvent.id);
  const orderedTimelineEvents: TimelineEvent[] = [];

  while (readyIds.length > 0) {
    const nextId = readyIds.shift();

    if (!nextId) {
      continue;
    }

    const timelineEvent = timelineEventById.get(nextId);

    if (!timelineEvent) {
      continue;
    }

    orderedTimelineEvents.push(timelineEvent);

    adjacencyById.get(nextId)?.forEach((linkedId) => {
      const nextIndegree = (indegreeById.get(linkedId) ?? 0) - 1;
      indegreeById.set(linkedId, nextIndegree);

      if (nextIndegree === 0) {
        insertTimelineIdByBaseIndex(readyIds, linkedId, baseIndexById);
      }
    });
  }

  if (orderedTimelineEvents.length === timelineEvents.length) {
    return orderedTimelineEvents;
  }

  const orderedIds = new Set(orderedTimelineEvents.map((timelineEvent) => timelineEvent.id));
  return [
    ...orderedTimelineEvents,
    ...timelineEvents.filter((timelineEvent) => !orderedIds.has(timelineEvent.id)),
  ];
}

function addTimelineAdjacencyEdge(
  adjacencyById: Map<string, Set<string>>,
  indegreeById: Map<string, number>,
  fromId: string,
  toId: string,
  timelineEventById: Map<string, TimelineEvent>
) {
  if (!timelineEventById.has(fromId) || !timelineEventById.has(toId) || fromId === toId) {
    return;
  }

  const linkedIds = adjacencyById.get(fromId);

  if (!linkedIds || linkedIds.has(toId)) {
    return;
  }

  linkedIds.add(toId);
  indegreeById.set(toId, (indegreeById.get(toId) ?? 0) + 1);
}

function insertTimelineIdByBaseIndex(
  readyIds: string[],
  nextId: string,
  baseIndexById: Map<string, number>
) {
  const nextIndex = baseIndexById.get(nextId) ?? Number.MAX_SAFE_INTEGER;
  const insertAt = readyIds.findIndex(
    (readyId) => (baseIndexById.get(readyId) ?? Number.MAX_SAFE_INTEGER) > nextIndex
  );

  if (insertAt === -1) {
    readyIds.push(nextId);
    return;
  }

  readyIds.splice(insertAt, 0, nextId);
}

function getTimelineAnchorGroupKey(timelineEvent: TimelineEvent) {
  const anchorYear = getTimelineEventAnchorYear(timelineEvent);
  return typeof anchorYear === "number" ? String(anchorYear) : "undated";
}

function formatPartialTimelineDate(
  year: number | null,
  month: number | null,
  day: number | null
) {
  if (typeof year !== "number") {
    return null;
  }

  if (typeof month !== "number") {
    return String(year);
  }

  if (typeof day !== "number") {
    return `${year}-${padDatePart(month)}`;
  }

  return `${year}-${padDatePart(month)}-${padDatePart(day)}`;
}

function appendTimeOfDayLabel(value: string, timeOfDayLabel: string) {
  const normalized = timeOfDayLabel.trim();
  return normalized ? `${value} (${normalized})` : value;
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function matchesTimelineWorkspaceFilters(
  timelineEvent: TimelineEvent,
  filters: TimelineWorkspaceFilters
) {
  if (filters.status !== "all" && timelineEvent.status !== filters.status) {
    return false;
  }

  if (filters.eventType !== "all" && timelineEvent.eventType !== filters.eventType) {
    return false;
  }

  if (filters.dating === "dated" && getTimelineEventAnchorYear(timelineEvent) === null) {
    return false;
  }

  if (filters.dating === "undated" && getTimelineEventAnchorYear(timelineEvent) !== null) {
    return false;
  }

  if (filters.linkScope !== "all" && !matchesLinkScope(timelineEvent, filters.linkScope)) {
    return false;
  }

  const normalizedSearch = filters.search.trim().toLowerCase();

  if (normalizedSearch && !buildSearchableTimelineText(timelineEvent).includes(normalizedSearch)) {
    return false;
  }

  return true;
}

function matchesLinkScope(
  timelineEvent: TimelineEvent,
  linkScope: TimelineWorkspaceLinkScopeFilter
) {
  if (linkScope === "manuscript") {
    return (
      timelineEvent.bookIds.length > 0 ||
      timelineEvent.chapterIds.length > 0 ||
      timelineEvent.sceneIds.length > 0
    );
  }

  if (linkScope === "characters") {
    return timelineEvent.characterIds.length > 0;
  }

  if (linkScope === "locations") {
    return timelineEvent.locationIds.length > 0;
  }

  if (linkScope === "worldbuilding") {
    return (
      !!timelineEvent.eraId ||
      timelineEvent.factionIds.length > 0 ||
      timelineEvent.cultureIds.length > 0 ||
      timelineEvent.technologyIds.length > 0 ||
      timelineEvent.religionIds.length > 0 ||
      timelineEvent.plotThreadIds.length > 0 ||
      timelineEvent.themeIds.length > 0
    );
  }

  if (linkScope === "continuity") {
    return hasTimelineContinuityLinks(timelineEvent);
  }

  return true;
}

function buildSearchableTimelineText(timelineEvent: TimelineEvent) {
  return [
    timelineEvent.id,
    timelineEvent.title,
    timelineEvent.summary,
    timelineEvent.description,
    timelineEvent.displayDateLabel,
    timelineEvent.publicWikiSummary,
    ...timelineEvent.tags,
    ...timelineEvent.bookIds,
    ...timelineEvent.chapterIds,
    ...timelineEvent.sceneIds,
    ...timelineEvent.characterIds,
    ...timelineEvent.locationIds,
    ...timelineEvent.factionIds,
    ...timelineEvent.cultureIds,
    ...timelineEvent.technologyIds,
    ...timelineEvent.religionIds,
    ...timelineEvent.plotThreadIds,
    ...timelineEvent.themeIds,
    ...timelineEvent.predecessorEventIds,
    ...timelineEvent.successorEventIds,
    ...timelineEvent.causes,
    ...timelineEvent.consequences,
  ]
    .join(" ")
    .toLowerCase();
}
