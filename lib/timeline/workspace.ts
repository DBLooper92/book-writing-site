import { getTimelineReferenceIssues, type TimelineReferenceSets } from "./references";
import {
  getTimelineEventBookmarkCollectionId,
  getTimelineBookmarkCollectionById,
  TIMELINE_BOOKMARK_COLLECTION_UNCATEGORIZED_ID,
  TIMELINE_BOOKMARK_COLLECTION_DEFAULT_COLOR,
  type TimelineBookmarkCollection,
} from "./bookmark-collections";
import {
  TIMELINE_EVENT_STATUS_OPTIONS,
  TIMELINE_EVENT_TYPE_OPTIONS,
  type TimelineEvent,
  type TimelineEventStatus,
  type TimelineEventType,
} from "../../types/timeline-event";

export type TimelineWorkspaceStatusFilter = "all" | TimelineEventStatus;
export type TimelineWorkspaceTypeFilter = "all" | TimelineEventType;

export type TimelineWorkspaceFilters = {
  bookIds: string[];
  chapterIds: string[];
  search: string;
  status: TimelineWorkspaceStatusFilter;
  eventType: TimelineWorkspaceTypeFilter;
  bookmarked: boolean;
  bookmarkCollectionIds: string[];
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

export function createEmptyTimelineWorkspaceFilters(): TimelineWorkspaceFilters {
  return {
    bookIds: [],
    chapterIds: [],
    search: "",
    status: "all",
    eventType: "all",
    bookmarked: false,
    bookmarkCollectionIds: [],
  };
}

export function hasActiveTimelineWorkspaceFilters(filters: TimelineWorkspaceFilters) {
  return (
    filters.bookIds.length > 0 ||
    filters.chapterIds.length > 0 ||
    filters.search.trim().length > 0 ||
    filters.status !== "all" ||
    filters.eventType !== "all" ||
    filters.bookmarked ||
    filters.bookmarkCollectionIds.length > 0
  );
}

export function getTimelineWorkspaceBookmarkAccentColor(
  filters: Pick<TimelineWorkspaceFilters, "bookmarked" | "bookmarkCollectionIds">,
  bookmarkCollections: ReadonlyArray<TimelineBookmarkCollection>
) {
  if (!filters.bookmarked || filters.bookmarkCollectionIds.length !== 1) {
    return null;
  }

  const bookmarkCollectionId = filters.bookmarkCollectionIds[0];

  if (bookmarkCollectionId === TIMELINE_BOOKMARK_COLLECTION_UNCATEGORIZED_ID) {
    return TIMELINE_BOOKMARK_COLLECTION_DEFAULT_COLOR;
  }

  return getTimelineBookmarkCollectionById(bookmarkCollections, bookmarkCollectionId)?.color ?? null;
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
  const orderedTimelineEvents = resolveTimelineAdjacencyOrder(baseSortedTimelineEvents);

  if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
    const insertionEvents = orderedTimelineEvents.filter(
      (timelineEvent) => timelineEvent.sourceInsertionItemId
    );

    if (insertionEvents.length > 0) {
      console.log("[timeline:sort]", {
        baseOrder: baseSortedTimelineEvents.map((timelineEvent) => timelineEvent.id),
        orderedOrder: orderedTimelineEvents.map((timelineEvent) => timelineEvent.id),
        insertionEvents: insertionEvents.map((timelineEvent) => ({
          id: timelineEvent.id,
          predecessorEventIds: timelineEvent.predecessorEventIds,
          sourceInsertionItemId: timelineEvent.sourceInsertionItemId,
          successorEventIds: timelineEvent.successorEventIds,
        })),
      });
    }
  }

  return orderedTimelineEvents;
}

export function compareTimelineEvents(left: TimelineEvent, right: TimelineEvent) {
  const startYearComparison = compareTimelineAnchorYear(
    getTimelineEventAnchorYear(left),
    getTimelineEventAnchorYear(right)
  );

  if (startYearComparison !== 0) {
    return startYearComparison;
  }

  const leftAnchorYear = getTimelineEventAnchorYear(left);
  const rightAnchorYear = getTimelineEventAnchorYear(right);

  if (leftAnchorYear === null && rightAnchorYear === null) {
    return compareUndatedTimelineEvents(left, right);
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

  const createdAtComparison = compareTimelineEventCreatedAt(left, right);

  if (createdAtComparison !== 0) {
    return createdAtComparison;
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
  _knownTimelineEventIds: ReadonlySet<string>,
  referenceSets?: TimelineReferenceSets | null
): TimelineWorkspaceIssue[] {
  const issues: TimelineWorkspaceIssue[] = [];

  if (
    hasInvalidTimelineEventDateRange(timelineEvent)
  ) {
    issues.push({
      severity: "warning",
      message: "End date is earlier than start date.",
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

function compareTimelineAnchorYear(left: number | null, right: number | null) {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  if (typeof left === "number") {
    return -1;
  }

  if (typeof right === "number") {
    return 1;
  }

  return 0;
}

function compareUndatedTimelineEvents(left: TimelineEvent, right: TimelineEvent) {
  const sourceInsertionComparison = compareSourceInsertionProvenance(
    left.sourceInsertionItemId,
    right.sourceInsertionItemId
  );

  if (sourceInsertionComparison !== 0) {
    return sourceInsertionComparison;
  }

  const createdAtComparison = compareTimelineEventCreatedAt(left, right);

  if (createdAtComparison !== 0) {
    return createdAtComparison;
  }

  return left.title.localeCompare(right.title);
}

function compareTimelineEventCreatedAt(left: TimelineEvent, right: TimelineEvent) {
  const leftCreatedAt = left.createdAt?.getTime() ?? null;
  const rightCreatedAt = right.createdAt?.getTime() ?? null;

  if (typeof leftCreatedAt === "number" && typeof rightCreatedAt === "number") {
    return leftCreatedAt - rightCreatedAt;
  }

  if (typeof leftCreatedAt === "number") {
    return -1;
  }

  if (typeof rightCreatedAt === "number") {
    return 1;
  }

  return 0;
}

function compareSourceInsertionProvenance(leftSourceInsertionItemId: string | null, rightSourceInsertionItemId: string | null) {
  if (leftSourceInsertionItemId && !rightSourceInsertionItemId) {
    return -1;
  }

  if (!leftSourceInsertionItemId && rightSourceInsertionItemId) {
    return 1;
  }

  if (leftSourceInsertionItemId && rightSourceInsertionItemId) {
    return leftSourceInsertionItemId.localeCompare(rightSourceInsertionItemId);
  }

  return 0;
}

function resolveTimelineAdjacencyOrder(timelineEvents: TimelineEvent[]) {
  if (timelineEvents.length < 2) {
    return timelineEvents;
  }

  const baseIndexById = new Map(
    timelineEvents.map((timelineEvent, index) => [timelineEvent.id, index])
  );
  const placementRankById = buildTimelineEventPlacementRankById(timelineEvents, baseIndexById);
  const timelineEventById = new Map(
    timelineEvents.map((timelineEvent) => [timelineEvent.id, timelineEvent])
  );
  const indegreeById = new Map(timelineEvents.map((timelineEvent) => [timelineEvent.id, 0]));
  const adjacencyById = new Map(
    timelineEvents.map((timelineEvent) => [timelineEvent.id, new Set<string>()])
  );

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
    .map((timelineEvent) => timelineEvent.id)
    .sort((leftId, rightId) =>
      compareReadyTimelineIds(leftId, rightId, placementRankById, baseIndexById, timelineEventById)
    );
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
        insertTimelineIdByPlacement(
          readyIds,
          linkedId,
          placementRankById,
          baseIndexById,
          timelineEventById
        );
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

function buildTimelineEventPlacementRankById(
  timelineEvents: TimelineEvent[],
  baseIndexById: Map<string, number>
) {
  const timelineEventById = new Map(
    timelineEvents.map((timelineEvent) => [timelineEvent.id, timelineEvent])
  );
  const placementRankById = new Map<string, number>();

  for (const timelineEvent of timelineEvents) {
    const insertionRank = parseInsertionItemRank(
      timelineEvent.sourceInsertionItemId,
      timelineEventById,
      baseIndexById
    );

    placementRankById.set(
      timelineEvent.id,
      insertionRank ?? (baseIndexById.get(timelineEvent.id) ?? Number.MAX_SAFE_INTEGER)
    );
  }

  return placementRankById;
}

function parseInsertionItemRank(
  sourceInsertionItemId: string | null,
  timelineEventById: Map<string, TimelineEvent>,
  baseIndexById: Map<string, number>
) {
  if (!sourceInsertionItemId || !sourceInsertionItemId.startsWith("notch-")) {
    return null;
  }

  const notchBody = sourceInsertionItemId.slice("notch-".length);
  const separatorIndexes: number[] = [];

  for (let index = 0; index < notchBody.length; index += 1) {
    if (notchBody[index] === "-") {
      separatorIndexes.push(index);
    }
  }

  for (const separatorIndex of separatorIndexes) {
    const previousEventId = notchBody.slice(0, separatorIndex);
    const nextEventId = notchBody.slice(separatorIndex + 1);

    if (!timelineEventById.has(previousEventId) || !timelineEventById.has(nextEventId)) {
      continue;
    }

    const previousIndex = baseIndexById.get(previousEventId);
    const nextIndex = baseIndexById.get(nextEventId);

    if (typeof previousIndex === "number" && typeof nextIndex === "number") {
      return previousIndex + 0.5;
    }

    if (typeof previousIndex === "number") {
      return previousIndex + 0.5;
    }

    if (typeof nextIndex === "number") {
      return nextIndex - 0.5;
    }
  }

  return null;
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

function insertTimelineIdByPlacement(
  readyIds: string[],
  nextId: string,
  placementRankById: Map<string, number>,
  baseIndexById: Map<string, number>,
  timelineEventById: Map<string, TimelineEvent>
) {
  const insertAt = readyIds.findIndex(
    (readyId) =>
      compareReadyTimelineIds(
        readyId,
        nextId,
        placementRankById,
        baseIndexById,
        timelineEventById
      ) > 0
  );

  if (insertAt === -1) {
    readyIds.push(nextId);
    return;
  }

  readyIds.splice(insertAt, 0, nextId);
}

function compareReadyTimelineIds(
  leftId: string,
  rightId: string,
  placementRankById: Map<string, number>,
  baseIndexById: Map<string, number>,
  timelineEventById: Map<string, TimelineEvent>
) {
  const leftPlacementRank = placementRankById.get(leftId) ?? Number.MAX_SAFE_INTEGER;
  const rightPlacementRank = placementRankById.get(rightId) ?? Number.MAX_SAFE_INTEGER;

  if (leftPlacementRank !== rightPlacementRank) {
    return leftPlacementRank - rightPlacementRank;
  }

  const leftBaseIndex = baseIndexById.get(leftId) ?? Number.MAX_SAFE_INTEGER;
  const rightBaseIndex = baseIndexById.get(rightId) ?? Number.MAX_SAFE_INTEGER;

  if (leftBaseIndex !== rightBaseIndex) {
    return leftBaseIndex - rightBaseIndex;
  }

  const leftTimelineEvent = timelineEventById.get(leftId);
  const rightTimelineEvent = timelineEventById.get(rightId);

  if (leftTimelineEvent && rightTimelineEvent) {
    const createdAtComparison = compareTimelineEventCreatedAt(leftTimelineEvent, rightTimelineEvent);

    if (createdAtComparison !== 0) {
      return createdAtComparison;
    }

    return leftTimelineEvent.title.localeCompare(rightTimelineEvent.title);
  }

  return leftId.localeCompare(rightId);
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
  if (filters.bookIds.length > 0 && !hasAnyOverlap(timelineEvent.bookIds, filters.bookIds)) {
    return false;
  }

  if (
    filters.chapterIds.length > 0 &&
    !hasAnyOverlap(timelineEvent.chapterIds, filters.chapterIds)
  ) {
    return false;
  }

  if (filters.status !== "all" && timelineEvent.status !== filters.status) {
    return false;
  }

  if (filters.eventType !== "all" && timelineEvent.eventType !== filters.eventType) {
    return false;
  }

  if (filters.bookmarked && !timelineEvent.tags.includes("bookmarked")) {
    return false;
  }

  if (filters.bookmarked && filters.bookmarkCollectionIds.length > 0) {
    const bookmarkCollectionId = getTimelineEventBookmarkCollectionId(timelineEvent);

    if (!bookmarkCollectionId) {
      return filters.bookmarkCollectionIds.includes(TIMELINE_BOOKMARK_COLLECTION_UNCATEGORIZED_ID);
    }

    if (!filters.bookmarkCollectionIds.includes(bookmarkCollectionId)) {
      return false;
    }
  }

  const normalizedSearch = filters.search.trim().toLowerCase();

  if (normalizedSearch && !buildSearchableTimelineText(timelineEvent).includes(normalizedSearch)) {
    return false;
  }

  return true;
}

function hasAnyOverlap(values: ReadonlyArray<string>, candidates: ReadonlyArray<string>) {
  const candidateSet = new Set(candidates);
  return values.some((value) => candidateSet.has(value));
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
