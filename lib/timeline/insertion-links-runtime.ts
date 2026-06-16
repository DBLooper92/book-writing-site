import {
  getTimelineEventById,
  updateTimelineEventContinuityForProject,
} from "@/lib/data/timeline-events";
import { replaceTimelineLinkIds, type TimelineInsertionBoundaryEventIds } from "@/lib/timeline/insertion-links";

export async function rewireTimelineInsertionBoundaryLinksForProject({
  boundaryEventIds,
  insertedEventIds,
  projectId,
  uid,
}: {
  boundaryEventIds: TimelineInsertionBoundaryEventIds;
  insertedEventIds: string[];
  projectId: string;
  uid: string;
}) {
  const firstInsertedEventId = insertedEventIds[0] ?? null;
  const lastInsertedEventId = insertedEventIds.at(-1) ?? null;

  if (!firstInsertedEventId && !lastInsertedEventId) {
    return;
  }

  const previousEventId = boundaryEventIds.previousEventId;
  const nextEventId = boundaryEventIds.nextEventId;

  if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
    console.log("[timeline:insertion-links] rewiring boundary", {
      boundaryEventIds,
      insertedEventIds,
    });
  }

  const [previousEvent, nextEvent] = await Promise.all([
    previousEventId ? getTimelineEventById(uid, projectId, previousEventId) : Promise.resolve(null),
    nextEventId ? getTimelineEventById(uid, projectId, nextEventId) : Promise.resolve(null),
  ]);

  if (previousEvent && firstInsertedEventId) {
    await updateTimelineEventContinuityForProject(uid, projectId, previousEvent.id, {
      predecessorEventIds: previousEvent.predecessorEventIds,
      successorEventIds: replaceTimelineLinkIds(
        previousEvent.successorEventIds,
        nextEventId,
        firstInsertedEventId
      ),
    });
  }

  if (nextEvent && lastInsertedEventId) {
    await updateTimelineEventContinuityForProject(uid, projectId, nextEvent.id, {
      predecessorEventIds: replaceTimelineLinkIds(
        nextEvent.predecessorEventIds,
        previousEventId,
        lastInsertedEventId
      ),
      successorEventIds: nextEvent.successorEventIds,
    });
  }

  if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
    console.log("[timeline:insertion-links] rewired boundary", {
      nextEventId: nextEvent?.id ?? null,
      previousEventId: previousEvent?.id ?? null,
      insertedEventIds,
    });
  }
}
