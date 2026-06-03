import "client-only";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";
import {
  buildChapterDocument,
  coerceChapterCanonLevel,
  coerceChapterConfidence,
  coerceChapterStatus,
  slugifyChapterTitle,
  type Chapter,
  type NormalizedChapterFormValues,
} from "@/types/chapter";

type ChapterRow = Database["public"]["Tables"]["chapters"]["Row"];

export async function getChaptersForProject(uid: string, projectId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("chapters")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => normalizeChapterRow(row as ChapterRow)).sort(compareChapters);
}

export async function getChapterById(uid: string, projectId: string, chapterId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("chapters")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", chapterId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeChapterRow(data as ChapterRow) : null;
}

export async function createChapterForProject(
  uid: string,
  projectId: string,
  values: NormalizedChapterFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Chapter title is required.");
  }

  const chapterId = await getAvailableChapterId(uid, projectId, title);
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();
  const chapterDocument = buildChapterDocument({
    id: chapterId,
    projectId,
    values,
  });

  const { error } = await supabase.from("chapters").insert({
    user_id: uid,
    project_id: projectId,
    id: chapterId,
    title: chapterDocument.title,
    slug: chapterDocument.slug,
    summary: chapterDocument.summary,
    description: chapterDocument.description,
    status: chapterDocument.status,
    tags: chapterDocument.tags,
    is_archived: chapterDocument.isArchived,
    canon_level: chapterDocument.canonLevel,
    confidence: chapterDocument.confidence,
    book_id: chapterDocument.bookId,
    chapter_number: chapterDocument.chapterNumber,
    purpose: chapterDocument.purpose,
    point_of_view_character_id: chapterDocument.pointOfViewCharacterId,
    timeline_event_ids: chapterDocument.timelineEventIds,
    scene_ids: chapterDocument.sceneIds,
    location_ids: chapterDocument.locationIds,
    character_ids: chapterDocument.characterIds,
    plot_thread_ids: chapterDocument.plotThreadIds,
    foreshadows: chapterDocument.foreshadows,
    payoffs: chapterDocument.payoffs,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw error;
  }

  return chapterId;
}

export async function updateChapterForProject(
  uid: string,
  projectId: string,
  chapterId: string,
  values: NormalizedChapterFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Chapter title is required.");
  }

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("chapters")
    .update({
      title,
      slug: slugifyChapterTitle(title),
      summary: values.summary,
      description: values.description,
      status: values.status,
      is_archived: values.status === "archived",
      book_id: values.bookId,
      chapter_number: values.chapterNumber,
      purpose: values.purpose,
      point_of_view_character_id: values.pointOfViewCharacterId,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", chapterId);

  if (error) {
    throw error;
  }
}

async function getAvailableChapterId(uid: string, projectId: string, title: string) {
  const baseId = buildChapterId(title);
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("chapters")
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

function normalizeChapterRow(row: ChapterRow): Chapter {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    slug: row.slug || slugifyChapterTitle(row.title),
    summary: row.summary || "",
    description: row.description || "",
    status: coerceChapterStatus(row.status),
    tags: row.tags ?? [],
    isArchived: row.is_archived ?? row.status === "archived",
    canonLevel: coerceChapterCanonLevel(row.canon_level),
    confidence: coerceChapterConfidence(row.confidence),
    bookId: row.book_id,
    chapterNumber: row.chapter_number,
    purpose: row.purpose || "",
    pointOfViewCharacterId: row.point_of_view_character_id,
    timelineEventIds: row.timeline_event_ids ?? [],
    sceneIds: row.scene_ids ?? [],
    locationIds: row.location_ids ?? [],
    characterIds: row.character_ids ?? [],
    plotThreadIds: row.plot_thread_ids ?? [],
    foreshadows: row.foreshadows ?? [],
    payoffs: row.payoffs ?? [],
    createdAt: readDateOrNull(row.created_at),
    updatedAt: readDateOrNull(row.updated_at),
  };
}

function buildChapterId(title: string) {
  const normalized = slugifyChapterTitle(title).replace(/-/g, "_");
  return `chapter_${normalized || "chapter"}`;
}

function compareChapters(left: Chapter, right: Chapter) {
  const leftBookKey = left.bookId ?? "~";
  const rightBookKey = right.bookId ?? "~";

  if (leftBookKey !== rightBookKey) {
    return leftBookKey.localeCompare(rightBookKey);
  }

  if (typeof left.chapterNumber === "number" && typeof right.chapterNumber === "number") {
    if (left.chapterNumber !== right.chapterNumber) {
      return left.chapterNumber - right.chapterNumber;
    }
  } else if (typeof left.chapterNumber === "number") {
    return -1;
  } else if (typeof right.chapterNumber === "number") {
    return 1;
  }

  return left.title.localeCompare(right.title);
}

function readDateOrNull(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
