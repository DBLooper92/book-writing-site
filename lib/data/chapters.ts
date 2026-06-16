import "client-only";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { upsertDocumentAttachmentForEntity } from "@/lib/data/attachments";
import { upsertManuscriptForProject } from "@/lib/data/manuscripts";
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
type ManuscriptRow = Database["public"]["Tables"]["manuscripts"]["Row"];

export async function getChaptersForProject(uid: string, projectId: string) {
  const supabase = getSupabaseBrowserClient();
  const [chaptersResult, manuscriptsResult] = await Promise.all([
    supabase.from("chapters").select("*").eq("user_id", uid).eq("project_id", projectId),
    supabase.from("manuscripts").select("*").eq("user_id", uid).eq("project_id", projectId),
  ]);

  const { data, error } = chaptersResult;

  if (error) {
    throw error;
  }

  if (manuscriptsResult.error) {
    throw manuscriptsResult.error;
  }

  const manuscriptDrafts = buildManuscriptDraftMap(manuscriptsResult.data ?? []);

  return (data ?? [])
    .map((row) =>
      normalizeChapterRow(
        row as ChapterRow,
        getChapterDraftTextForRow(row as ChapterRow, manuscriptDrafts)
      )
    )
    .sort(compareChapters);
}

export async function getChapterById(uid: string, projectId: string, chapterId: string) {
  const supabase = getSupabaseBrowserClient();
  const [chapterResult, manuscriptsResult] = await Promise.all([
    supabase
      .from("chapters")
      .select("*")
      .eq("user_id", uid)
      .eq("project_id", projectId)
      .eq("id", chapterId)
      .maybeSingle(),
    supabase.from("manuscripts").select("*").eq("user_id", uid).eq("project_id", projectId),
  ]);

  const { data, error } = chapterResult;

  if (error) {
    throw error;
  }

  if (manuscriptsResult.error) {
    throw manuscriptsResult.error;
  }

  const manuscriptDrafts = buildManuscriptDraftMap(manuscriptsResult.data ?? []);

  return data
    ? normalizeChapterRow(
        data as ChapterRow,
        getChapterDraftTextForRow(data as ChapterRow, manuscriptDrafts)
      )
    : null;
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
  const draftAttachmentId = buildChapterDraftAttachmentId(chapterId);
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();
  const chapterDocument = buildChapterDocument({
    id: chapterId,
    projectId,
    draftAttachmentId,
    draftText: "",
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
    draft_text: chapterDocument.draftText,
    draft_attachment_id: chapterDocument.draftAttachmentId,
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
    console.error("[chapter:create] chapter row insert failed", {
      chapterId,
      error,
      projectId,
      uid,
    });
    throw error;
  }

  try {
    await upsertDocumentAttachmentForEntity(uid, projectId, {
      attachmentId: draftAttachmentId,
      bodyText: "",
      entityId: chapterId,
      entityType: "chapter",
      title: chapterDocument.title,
    });
  } catch (attachmentError) {
    console.error("[chapter:create] attachment creation failed, removing chapter row", {
      attachmentError,
      chapterId,
      draftAttachmentId,
      projectId,
      uid,
    });
    await supabase
      .from("chapters")
      .delete()
      .eq("user_id", uid)
      .eq("project_id", projectId)
      .eq("id", chapterId);
    throw attachmentError;
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

  const currentChapter = await getChapterById(uid, projectId, chapterId);

  if (currentChapter?.draftAttachmentId) {
    await upsertDocumentAttachmentForEntity(uid, projectId, {
      attachmentId: currentChapter.draftAttachmentId,
      bodyText: currentChapter.draftText,
      entityId: currentChapter.id,
      entityType: "chapter",
      title: currentChapter.title,
    });
  }
}

export async function saveChapterDraftForProject(
  uid: string,
  projectId: string,
  chapterId: string,
  draftText: string
) {
  const currentChapter = await getChapterById(uid, projectId, chapterId);

  if (!currentChapter) {
    throw new Error("Chapter not found in the active project.");
  }

  const chapterDraftAttachmentId =
    currentChapter.draftAttachmentId ?? buildChapterDraftAttachmentId(currentChapter.id);

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("chapters")
    .update({
      draft_text: draftText,
      draft_attachment_id: chapterDraftAttachmentId,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", chapterId);

  if (error) {
    console.error("[chapter:draft-save] chapter row update failed", {
      chapterId,
      error,
      projectId,
      uid,
    });
    throw error;
  }

  await upsertDocumentAttachmentForEntity(uid, projectId, {
    attachmentId: chapterDraftAttachmentId,
    bodyText: draftText,
    entityId: currentChapter.id,
    entityType: "chapter",
    title: currentChapter.title,
  });

  if (currentChapter.bookId && typeof currentChapter.chapterNumber === "number") {
    await upsertManuscriptForProject(uid, projectId, {
      bodyText: draftText,
      bookId: currentChapter.bookId,
      chapterId: currentChapter.id,
      chapterNumber: currentChapter.chapterNumber,
      chapterTitle: currentChapter.title,
    });
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

function normalizeChapterRow(row: ChapterRow, draftText = ""): Chapter {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    slug: row.slug || slugifyChapterTitle(row.title),
    summary: row.summary || "",
    description: row.description || "",
    draftText: row.draft_text || draftText || "",
    draftAttachmentId: row.draft_attachment_id ?? null,
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

function buildManuscriptDraftMap(manuscriptRows: ManuscriptRow[]) {
  const byChapterId = new Map<string, string>();
  const byBookAndChapterNumber = new Map<string, string>();

  for (const row of manuscriptRows) {
    if (typeof row.chapter_id === "string" && row.chapter_id.trim()) {
      byChapterId.set(row.chapter_id, row.body_text ?? "");
    }

    if (typeof row.book_id === "string" && row.book_id.trim()) {
      byBookAndChapterNumber.set(`${row.book_id}:${row.chapter_number}`, row.body_text ?? "");
    }
  }

  return { byBookAndChapterNumber, byChapterId };
}

function getChapterDraftTextForRow(
  row: ChapterRow,
  manuscriptDrafts: ReturnType<typeof buildManuscriptDraftMap>
) {
  const chapterDraftText = row.draft_text || "";

  if (chapterDraftText.trim().length > 0) {
    return chapterDraftText;
  }

  const byChapterId = manuscriptDrafts.byChapterId.get(row.id);

  if (typeof byChapterId === "string" && byChapterId.trim().length > 0) {
    return byChapterId;
  }

  if (row.book_id && typeof row.chapter_number === "number") {
    const byBookAndChapterNumber = manuscriptDrafts.byBookAndChapterNumber.get(
      `${row.book_id}:${row.chapter_number}`
    );

    if (typeof byBookAndChapterNumber === "string") {
      return byBookAndChapterNumber;
    }
  }

  return "";
}

function buildChapterDraftAttachmentId(chapterId: string) {
  return `chapter_draft_${chapterId}`;
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
