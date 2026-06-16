export type TimelineInsertionBoundaryEventIds = {
  previousEventId: string | null;
  nextEventId: string | null;
};

export function replaceTimelineLinkIds(
  existingIds: string[],
  removedId: string | null,
  insertedId: string | null
) {
  const nextIds = existingIds.filter((eventId) => eventId !== removedId);

  if (insertedId && !nextIds.includes(insertedId)) {
    nextIds.push(insertedId);
  }

  return nextIds;
}
