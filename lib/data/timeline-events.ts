import "client-only";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { sortTimelineEvents } from "@/lib/timeline/workspace";
import type { Database } from "@/types/database";
import {
  buildTimelineEventDocument,
  coerceTimelineEventCanonLevel,
  coerceTimelineEventConfidence,
  coerceTimelineEventStatus,
  coerceTimelineEventType,
  slugifyTimelineEventTitle,
  validateNormalizedTimelineEventFormValues,
  type NormalizedTimelineEventFormValues,
  type TimelineEvent,
} from "@/types/timeline-event";

type TimelineEventRow = Database["public"]["Tables"]["timeline_events"]["Row"];

export async function getTimelineEventsForProject(uid: string, projectId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("timeline_events")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId);

  if (error) {
    throw error;
  }

  return sortTimelineEvents(
    (data ?? []).map((row) => normalizeTimelineEventRow(row as TimelineEventRow))
  );
}

export async function getTimelineEventById(
  uid: string,
  projectId: string,
  timelineEventId: string
) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("timeline_events")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", timelineEventId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeTimelineEventRow(data as TimelineEventRow) : null;
}

export async function createTimelineEventForProject(
  uid: string,
  projectId: string,
  values: NormalizedTimelineEventFormValues
) {
  assertValidTimelineEventValues(values);

  const title = values.title.trim();
  const timelineEventId = await getAvailableTimelineEventId(uid, projectId, title);
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();
  const timelineEventDocument = buildTimelineEventDocument({
    id: timelineEventId,
    projectId,
    values,
  });

  const { error } = await supabase.from("timeline_events").insert({
    user_id: uid,
    project_id: projectId,
    id: timelineEventId,
    title: timelineEventDocument.title,
    slug: timelineEventDocument.slug,
    summary: timelineEventDocument.summary,
    description: timelineEventDocument.description,
    status: timelineEventDocument.status,
    tags: timelineEventDocument.tags,
    is_archived: timelineEventDocument.isArchived,
    canon_level: timelineEventDocument.canonLevel,
    confidence: timelineEventDocument.confidence,
    event_type: timelineEventDocument.eventType,
    year_start: timelineEventDocument.yearStart,
    month_start: timelineEventDocument.monthStart,
    day_start: timelineEventDocument.dayStart,
    year_end: timelineEventDocument.yearEnd,
    month_end: timelineEventDocument.monthEnd,
    day_end: timelineEventDocument.dayEnd,
    chronology_order: timelineEventDocument.chronologyOrder,
    time_of_day_label: timelineEventDocument.timeOfDayLabel,
    display_date_label: timelineEventDocument.displayDateLabel,
    era_id: timelineEventDocument.eraId,
    book_ids: timelineEventDocument.bookIds,
    chapter_ids: timelineEventDocument.chapterIds,
    scene_ids: timelineEventDocument.sceneIds,
    character_ids: timelineEventDocument.characterIds,
    location_ids: timelineEventDocument.locationIds,
    faction_ids: timelineEventDocument.factionIds,
    culture_ids: timelineEventDocument.cultureIds,
    technology_ids: timelineEventDocument.technologyIds,
    religion_ids: timelineEventDocument.religionIds,
    plot_thread_ids: timelineEventDocument.plotThreadIds,
    theme_ids: timelineEventDocument.themeIds,
    causes: timelineEventDocument.causes,
    consequences: timelineEventDocument.consequences,
    predecessor_event_ids: timelineEventDocument.predecessorEventIds,
    successor_event_ids: timelineEventDocument.successorEventIds,
    public_wiki_summary: timelineEventDocument.publicWikiSummary,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw error;
  }

  return timelineEventId;
}

export async function updateTimelineEventForProject(
  uid: string,
  projectId: string,
  timelineEventId: string,
  values: NormalizedTimelineEventFormValues
) {
  assertValidTimelineEventValues(values, timelineEventId);

  const title = values.title.trim();
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("timeline_events")
    .update({
      title,
      slug: slugifyTimelineEventTitle(title),
      summary: values.summary,
      description: values.description,
      status: values.status,
      is_archived: values.status === "archived",
      event_type: values.eventType,
      year_start: values.yearStart,
      month_start: values.monthStart,
      day_start: values.dayStart,
      year_end: values.yearEnd,
      month_end: values.monthEnd,
      day_end: values.dayEnd,
      chronology_order: values.chronologyOrder,
      time_of_day_label: values.timeOfDayLabel,
      display_date_label: values.displayDateLabel,
      era_id: values.eraId,
      book_ids: values.bookIds,
      chapter_ids: values.chapterIds,
      scene_ids: values.sceneIds,
      character_ids: values.characterIds,
      location_ids: values.locationIds,
      faction_ids: values.factionIds,
      culture_ids: values.cultureIds,
      technology_ids: values.technologyIds,
      religion_ids: values.religionIds,
      plot_thread_ids: values.plotThreadIds,
      theme_ids: values.themeIds,
      causes: values.causes,
      consequences: values.consequences,
      predecessor_event_ids: values.predecessorEventIds,
      successor_event_ids: values.successorEventIds,
      public_wiki_summary: values.publicWikiSummary,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", timelineEventId);

  if (error) {
    throw error;
  }
}

export async function updateTimelineEventSummaryAndDescriptionForProject(
  uid: string,
  projectId: string,
  timelineEventId: string,
  payload: {
    summary: string;
    description: string;
  }
) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("timeline_events")
    .update({
      summary: payload.summary.trim(),
      description: payload.description.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", timelineEventId);

  if (error) {
    throw error;
  }
}

export async function deleteTimelineEventForProject(
  uid: string,
  projectId: string,
  timelineEventId: string
) {
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();

  const { error: deleteError } = await supabase
    .from("timeline_events")
    .delete()
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", timelineEventId);

  if (deleteError) {
    throw deleteError;
  }

  const { data: remainingRows, error: selectError } = await supabase
    .from("timeline_events")
    .select("id, predecessor_event_ids, successor_event_ids")
    .eq("user_id", uid)
    .eq("project_id", projectId);

  if (selectError) {
    throw selectError;
  }

  const impactedRows = (remainingRows ?? []).filter((row) => {
    const predecessorEventIds = row.predecessor_event_ids ?? [];
    const successorEventIds = row.successor_event_ids ?? [];

    return (
      predecessorEventIds.includes(timelineEventId) || successorEventIds.includes(timelineEventId)
    );
  });

  for (const row of impactedRows) {
    const nextPredecessorEventIds = (row.predecessor_event_ids ?? []).filter(
      (eventId) => eventId !== timelineEventId
    );
    const nextSuccessorEventIds = (row.successor_event_ids ?? []).filter(
      (eventId) => eventId !== timelineEventId
    );

    const { error: updateError } = await supabase
      .from("timeline_events")
      .update({
        predecessor_event_ids: nextPredecessorEventIds,
        successor_event_ids: nextSuccessorEventIds,
        updated_at: now,
      })
      .eq("user_id", uid)
      .eq("project_id", projectId)
      .eq("id", row.id);

    if (updateError) {
      throw updateError;
    }
  }
}

async function getAvailableTimelineEventId(uid: string, projectId: string, title: string) {
  const baseId = buildTimelineEventId(title);
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("timeline_events")
    .select("id")
    .eq("user_id", uid)
    .eq("project_id", projectId);

  if (error) {
    throw error;
  }

  const existingIds = new Set((data ?? []).map((row) => row.id));
  let candidateId = baseId;
  let suffix = 2;

  while (existingIds.has(candidateId)) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}

function normalizeTimelineEventRow(row: TimelineEventRow): TimelineEvent {
  const status = coerceTimelineEventStatus(row.status);

  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    slug: row.slug || slugifyTimelineEventTitle(row.title),
    summary: row.summary || "",
    description: row.description || "",
    status,
    tags: row.tags ?? [],
    isArchived: row.is_archived ?? status === "archived",
    canonLevel: coerceTimelineEventCanonLevel(row.canon_level),
    confidence: coerceTimelineEventConfidence(row.confidence),
    eventType: coerceTimelineEventType(row.event_type),
    yearStart: row.year_start,
    monthStart: row.month_start,
    dayStart: row.day_start,
    yearEnd: row.year_end,
    monthEnd: row.month_end,
    dayEnd: row.day_end,
    chronologyOrder: row.chronology_order,
    timeOfDayLabel: row.time_of_day_label || "",
    displayDateLabel: row.display_date_label || "",
    eraId: row.era_id,
    bookIds: row.book_ids ?? [],
    chapterIds: row.chapter_ids ?? [],
    sceneIds: row.scene_ids ?? [],
    characterIds: row.character_ids ?? [],
    locationIds: row.location_ids ?? [],
    factionIds: row.faction_ids ?? [],
    cultureIds: row.culture_ids ?? [],
    technologyIds: row.technology_ids ?? [],
    religionIds: row.religion_ids ?? [],
    plotThreadIds: row.plot_thread_ids ?? [],
    themeIds: row.theme_ids ?? [],
    causes: row.causes ?? [],
    consequences: row.consequences ?? [],
    predecessorEventIds: row.predecessor_event_ids ?? [],
    successorEventIds: row.successor_event_ids ?? [],
    publicWikiSummary: row.public_wiki_summary || "",
    createdAt: readDateOrNull(row.created_at),
    updatedAt: readDateOrNull(row.updated_at),
  };
}

function buildTimelineEventId(title: string) {
  const normalized = slugifyTimelineEventTitle(title).replace(/-/g, "_");
  return `event_${normalized || "event"}`;
}

function assertValidTimelineEventValues(
  values: NormalizedTimelineEventFormValues,
  currentTimelineEventId?: string
) {
  const validationResult = validateNormalizedTimelineEventFormValues(values, {
    currentTimelineEventId,
  });

  if (validationResult.errors.length > 0) {
    throw new Error(validationResult.errors[0]);
  }
}

function readDateOrNull(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
