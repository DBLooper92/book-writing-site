import "client-only";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";
import {
  buildSceneDocument,
  coerceSceneCanonLevel,
  coerceSceneConfidence,
  coerceSceneStatus,
  coerceSceneType,
  slugifySceneTitle,
  type NormalizedSceneFormValues,
  type Scene,
} from "@/types/scene";

type SceneRow = Database["public"]["Tables"]["scenes"]["Row"];

export async function getScenesForProject(uid: string, projectId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("scenes")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => normalizeSceneRow(row as SceneRow)).sort(compareScenes);
}

export async function getSceneById(uid: string, projectId: string, sceneId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("scenes")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", sceneId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeSceneRow(data as SceneRow) : null;
}

export async function createSceneForProject(
  uid: string,
  projectId: string,
  values: NormalizedSceneFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Scene title is required.");
  }

  const sceneId = await getAvailableSceneId(uid, projectId, title);
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();
  const sceneDocument = buildSceneDocument({
    id: sceneId,
    projectId,
    values,
  });

  const { error } = await supabase.from("scenes").insert({
    user_id: uid,
    project_id: projectId,
    id: sceneId,
    title: sceneDocument.title,
    slug: sceneDocument.slug,
    summary: sceneDocument.summary,
    description: sceneDocument.description,
    status: sceneDocument.status,
    tags: sceneDocument.tags,
    is_archived: sceneDocument.isArchived,
    canon_level: sceneDocument.canonLevel,
    confidence: sceneDocument.confidence,
    book_id: sceneDocument.bookId,
    chapter_id: sceneDocument.chapterId,
    scene_number: sceneDocument.sceneNumber,
    scene_type: sceneDocument.sceneType,
    point_of_view_character_id: sceneDocument.pointOfViewCharacterId,
    goal: sceneDocument.goal,
    conflict: sceneDocument.conflict,
    outcome: sceneDocument.outcome,
    text_draft: sceneDocument.textDraft,
    timeline_event_ids: sceneDocument.timelineEventIds,
    character_ids: sceneDocument.characterIds,
    location_ids: sceneDocument.locationIds,
    plot_thread_ids: sceneDocument.plotThreadIds,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw error;
  }

  return sceneId;
}

export async function updateSceneForProject(
  uid: string,
  projectId: string,
  sceneId: string,
  values: NormalizedSceneFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Scene title is required.");
  }

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("scenes")
    .update({
      title,
      slug: slugifySceneTitle(title),
      summary: values.summary,
      description: values.description,
      status: values.status,
      is_archived: values.status === "archived",
      book_id: values.bookId,
      chapter_id: values.chapterId,
      scene_number: values.sceneNumber,
      scene_type: values.sceneType,
      point_of_view_character_id: values.pointOfViewCharacterId,
      goal: values.goal,
      conflict: values.conflict,
      outcome: values.outcome,
      text_draft: values.textDraft,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", sceneId);

  if (error) {
    throw error;
  }
}

async function getAvailableSceneId(uid: string, projectId: string, title: string) {
  const baseId = buildSceneId(title);
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("scenes")
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

function normalizeSceneRow(row: SceneRow): Scene {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    slug: row.slug || slugifySceneTitle(row.title),
    summary: row.summary || "",
    description: row.description || "",
    status: coerceSceneStatus(row.status),
    tags: row.tags ?? [],
    isArchived: row.is_archived ?? row.status === "archived",
    canonLevel: coerceSceneCanonLevel(row.canon_level),
    confidence: coerceSceneConfidence(row.confidence),
    bookId: row.book_id,
    chapterId: row.chapter_id,
    sceneNumber: row.scene_number,
    sceneType: coerceSceneType(row.scene_type),
    pointOfViewCharacterId: row.point_of_view_character_id,
    goal: row.goal || "",
    conflict: row.conflict || "",
    outcome: row.outcome || "",
    textDraft: row.text_draft || "",
    timelineEventIds: row.timeline_event_ids ?? [],
    characterIds: row.character_ids ?? [],
    locationIds: row.location_ids ?? [],
    plotThreadIds: row.plot_thread_ids ?? [],
    createdAt: readDateOrNull(row.created_at),
    updatedAt: readDateOrNull(row.updated_at),
  };
}

function buildSceneId(title: string) {
  const normalized = slugifySceneTitle(title).replace(/-/g, "_");
  return `scene_${normalized || "scene"}`;
}

function compareScenes(left: Scene, right: Scene) {
  const leftBookKey = left.bookId ?? "~";
  const rightBookKey = right.bookId ?? "~";

  if (leftBookKey !== rightBookKey) {
    return leftBookKey.localeCompare(rightBookKey);
  }

  const leftChapterKey = left.chapterId ?? "~";
  const rightChapterKey = right.chapterId ?? "~";

  if (leftChapterKey !== rightChapterKey) {
    return leftChapterKey.localeCompare(rightChapterKey);
  }

  if (typeof left.sceneNumber === "number" && typeof right.sceneNumber === "number") {
    if (left.sceneNumber !== right.sceneNumber) {
      return left.sceneNumber - right.sceneNumber;
    }
  } else if (typeof left.sceneNumber === "number") {
    return -1;
  } else if (typeof right.sceneNumber === "number") {
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
