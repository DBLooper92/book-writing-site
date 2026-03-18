import "client-only";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import {
  buildTimelineEventDocument,
  coerceTimelineEventCanonLevel,
  coerceTimelineEventConfidence,
  coerceTimelineEventStatus,
  coerceTimelineEventType,
  slugifyTimelineEventTitle,
  type NormalizedTimelineEventFormValues,
  type TimelineEvent,
} from "@/types/timeline-event";

export function getTimelineEventDocPath(
  uid: string,
  projectId: string,
  timelineEventId: string
) {
  return doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "timeline_events",
    timelineEventId
  ).path;
}

export function observeTimelineEventsForProject(
  uid: string,
  projectId: string,
  callback: (timelineEvents: TimelineEvent[]) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const timelineEventsRef = collection(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "timeline_events"
  );

  return onSnapshot(
    timelineEventsRef,
    (snapshot) => {
      const timelineEvents = snapshot.docs
        .map((timelineEventDoc) =>
          normalizeTimelineEventDocument(timelineEventDoc.id, projectId, timelineEventDoc.data())
        )
        .sort(compareTimelineEvents);

      callback(timelineEvents);
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export function observeTimelineEventById(
  uid: string,
  projectId: string,
  timelineEventId: string,
  callback: (timelineEvent: TimelineEvent | null) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const timelineEventRef = doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "timeline_events",
    timelineEventId
  );

  return onSnapshot(
    timelineEventRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback(normalizeTimelineEventDocument(snapshot.id, projectId, snapshot.data()));
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export async function getTimelineEventById(
  uid: string,
  projectId: string,
  timelineEventId: string
) {
  const timelineEventRef = doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "timeline_events",
    timelineEventId
  );
  const snapshot = await getDoc(timelineEventRef);

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeTimelineEventDocument(snapshot.id, projectId, snapshot.data());
}

export async function createTimelineEventForProject(
  uid: string,
  projectId: string,
  values: NormalizedTimelineEventFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Timeline event title is required.");
  }

  const timelineEventId = await getAvailableTimelineEventId(uid, projectId, title);
  const timelineEventRef = doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "timeline_events",
    timelineEventId
  );
  const timelineEventDocument = buildTimelineEventDocument({
    id: timelineEventId,
    projectId,
    values,
  });

  await setDoc(timelineEventRef, {
    ...timelineEventDocument,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return timelineEventId;
}

export async function updateTimelineEventForProject(
  uid: string,
  projectId: string,
  timelineEventId: string,
  values: NormalizedTimelineEventFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Timeline event title is required.");
  }

  const timelineEventRef = doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "timeline_events",
    timelineEventId
  );

  await setDoc(
    timelineEventRef,
    {
      projectId,
      title,
      slug: slugifyTimelineEventTitle(title),
      summary: values.summary,
      description: values.description,
      status: values.status,
      isArchived: values.status === "archived",
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
      causes: values.causes,
      consequences: values.consequences,
      publicWikiSummary: values.publicWikiSummary,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

function normalizeTimelineEventDocument(
  documentId: string,
  projectId: string,
  data: Record<string, unknown> | undefined
): TimelineEvent {
  const status = coerceTimelineEventStatus(data?.status);
  const explicitIsArchived = readBooleanOrNull(data?.isArchived);

  return {
    id: documentId,
    projectId: readString(data?.projectId) ?? projectId,
    title: readString(data?.title) ?? documentId,
    slug:
      readString(data?.slug) ??
      slugifyTimelineEventTitle(readString(data?.title) ?? documentId),
    summary: readString(data?.summary) ?? "",
    description: readString(data?.description) ?? "",
    status,
    tags: readStringArray(data?.tags),
    isArchived: explicitIsArchived ?? status === "archived",
    canonLevel: coerceTimelineEventCanonLevel(data?.canonLevel),
    confidence: coerceTimelineEventConfidence(data?.confidence),
    eventType: coerceTimelineEventType(data?.eventType),
    yearStart: readNumberOrNull(data?.yearStart),
    yearEnd: readNumberOrNull(data?.yearEnd),
    displayDateLabel: readString(data?.displayDateLabel) ?? "",
    eraId: readNullableString(data?.eraId),
    bookIds: readStringArray(data?.bookIds),
    chapterIds: readStringArray(data?.chapterIds),
    sceneIds: readStringArray(data?.sceneIds),
    characterIds: readStringArray(data?.characterIds),
    locationIds: readStringArray(data?.locationIds),
    factionIds: readStringArray(data?.factionIds),
    cultureIds: readStringArray(data?.cultureIds),
    technologyIds: readStringArray(data?.technologyIds),
    religionIds: readStringArray(data?.religionIds),
    plotThreadIds: readStringArray(data?.plotThreadIds),
    themeIds: readStringArray(data?.themeIds),
    causes: readStringArray(data?.causes),
    consequences: readStringArray(data?.consequences),
    predecessorEventIds: readStringArray(data?.predecessorEventIds),
    successorEventIds: readStringArray(data?.successorEventIds),
    publicWikiSummary: readString(data?.publicWikiSummary) ?? "",
    createdAt: readTimestamp(data?.createdAt),
    updatedAt: readTimestamp(data?.updatedAt),
  };
}

async function getAvailableTimelineEventId(uid: string, projectId: string, title: string) {
  const baseId = buildTimelineEventId(title);
  let candidateId = baseId;
  let suffix = 2;

  while (
    (
      await getDoc(
        doc(db, "users", uid, "projects", projectId, "timeline_events", candidateId)
      )
    ).exists()
  ) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}

function buildTimelineEventId(title: string) {
  const normalized = slugifyTimelineEventTitle(title).replace(/-/g, "_");
  return `event_${normalized || "event"}`;
}

function compareTimelineEvents(left: TimelineEvent, right: TimelineEvent) {
  const leftYearStart = left.yearStart;
  const rightYearStart = right.yearStart;

  if (typeof leftYearStart === "number" && typeof rightYearStart === "number") {
    if (leftYearStart !== rightYearStart) {
      return leftYearStart - rightYearStart;
    }
  } else if (typeof leftYearStart === "number") {
    return -1;
  } else if (typeof rightYearStart === "number") {
    return 1;
  }

  const leftYearEnd = left.yearEnd;
  const rightYearEnd = right.yearEnd;

  if (typeof leftYearEnd === "number" && typeof rightYearEnd === "number") {
    if (leftYearEnd !== rightYearEnd) {
      return leftYearEnd - rightYearEnd;
    }
  } else if (typeof leftYearEnd === "number") {
    return -1;
  } else if (typeof rightYearEnd === "number") {
    return 1;
  }

  return left.title.localeCompare(right.title);
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function readStringArray(value: unknown) {
  if (typeof value === "string") {
    return value.trim() ? [value.trim()] : [];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function readNumberOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function readBooleanOrNull(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function readTimestamp(value: unknown) {
  return value instanceof Timestamp ? value : null;
}
