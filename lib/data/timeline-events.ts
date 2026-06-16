import "client-only";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { deleteEntityForProject } from "@/lib/data/entity-deletions";
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
  type TimelineEventCreationProvenance,
  type NormalizedTimelineEventFormValues,
  type TimelineEvent,
} from "@/types/timeline-event";
import {
  buildTimelineEventBookmarkCollectionTag,
  TIMELINE_BOOKMARK_COLLECTION_TAG_PREFIX,
  TIMELINE_BOOKMARK_COLLECTION_UNCATEGORIZED_ID,
} from "@/lib/timeline/bookmark-collections";

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
  values: NormalizedTimelineEventFormValues,
  provenance?: TimelineEventCreationProvenance | null
) {
  assertValidTimelineEventValues(values);

  const title = values.title.trim();
  const timelineEventId = await getAvailableTimelineEventId(uid, projectId, title);
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();
  const timelineEventDocument = buildTimelineEventDocument({
    id: timelineEventId,
    projectId,
    provenance,
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
    creation_source: timelineEventDocument.creationSource,
    source_brain_dump_text: timelineEventDocument.sourceBrainDumpText,
    source_insertion_item_id: timelineEventDocument.sourceInsertionItemId,
    source_job_id: timelineEventDocument.sourceJobId,
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

export async function updateTimelineEventContinuityForProject(
  uid: string,
  projectId: string,
  timelineEventId: string,
  values: {
    predecessorEventIds: string[];
    successorEventIds: string[];
  }
) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("timeline_events")
    .update({
      predecessor_event_ids: values.predecessorEventIds,
      successor_event_ids: values.successorEventIds,
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

export async function setTimelineEventBookmarkedForProject(
  uid: string,
  projectId: string,
  timelineEventId: string,
  bookmarked: boolean,
  bookmarkCollectionId?: string | null
) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("timeline_events")
    .select("tags")
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", timelineEventId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const tags = Array.isArray(data?.tags) ? data.tags.filter((tag) => typeof tag === "string") : [];
  const nextTags = bookmarked
    ? buildBookmarkTags(tags, bookmarkCollectionId ?? null)
    : tags.filter(
        (tag) =>
          tag !== "bookmarked" && !tag.startsWith(TIMELINE_BOOKMARK_COLLECTION_TAG_PREFIX)
      );

  const { error: updateError } = await supabase
    .from("timeline_events")
    .update({
      tags: nextTags,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", timelineEventId);

  if (updateError) {
    throw updateError;
  }
}

function buildBookmarkTags(tags: string[], bookmarkCollectionId: string | null) {
  const nextTags = tags.filter(
    (tag) => tag !== "bookmarked" && !tag.startsWith(TIMELINE_BOOKMARK_COLLECTION_TAG_PREFIX)
  );

  nextTags.push("bookmarked");

  if (bookmarkCollectionId && bookmarkCollectionId !== TIMELINE_BOOKMARK_COLLECTION_UNCATEGORIZED_ID) {
    nextTags.push(buildTimelineEventBookmarkCollectionTag(bookmarkCollectionId));
  }

  return Array.from(new Set(nextTags));
}

export async function deleteTimelineEventForProject(
  uid: string,
  projectId: string,
  timelineEventId: string
) {
  await deleteEntityForProject(uid, projectId, "timeline_events", timelineEventId);
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
    creationSource: normalizeTimelineEventCreationSource(row.creation_source),
    sourceBrainDumpText: row.source_brain_dump_text || "",
    sourceInsertionItemId: row.source_insertion_item_id ?? null,
    sourceJobId: row.source_job_id ?? null,
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

function normalizeTimelineEventCreationSource(value: unknown) {
  return value === "ai_single" || value === "ai_multi" ? value : "manual";
}
