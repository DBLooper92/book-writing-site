import "client-only";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";
import {
  buildBookDocument,
  coerceBookCanonLevel,
  coerceBookConfidence,
  coerceBookDraftStage,
  coerceBookStatus,
  slugifyBookTitle,
  type Book,
  type NormalizedBookFormValues,
} from "@/types/book";

type BookRow = Database["public"]["Tables"]["books"]["Row"];

export async function getBooksForProject(uid: string, projectId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => normalizeBookRow(row as BookRow)).sort(compareBooks);
}

export async function getBookById(uid: string, projectId: string, bookId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", bookId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeBookRow(data as BookRow) : null;
}

export async function createBookForProject(
  uid: string,
  projectId: string,
  values: NormalizedBookFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Book title is required.");
  }

  const bookId = await getAvailableBookId(uid, projectId, title);
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();
  const bookDocument = buildBookDocument({
    id: bookId,
    projectId,
    values,
  });

  const { error } = await supabase.from("books").insert({
    user_id: uid,
    project_id: projectId,
    id: bookId,
    title: bookDocument.title,
    slug: bookDocument.slug,
    pen_name: bookDocument.penName,
    summary: bookDocument.summary,
    description: bookDocument.description,
    status: bookDocument.status,
    tags: bookDocument.tags,
    is_archived: bookDocument.isArchived,
    canon_level: bookDocument.canonLevel,
    confidence: bookDocument.confidence,
    series_order: bookDocument.seriesOrder,
    internal_chronology_start: bookDocument.internalChronologyStart,
    internal_chronology_end: bookDocument.internalChronologyEnd,
    premise: bookDocument.premise,
    draft_stage: bookDocument.draftStage,
    word_count_target: bookDocument.wordCountTarget,
    word_count_current: bookDocument.wordCountCurrent,
    primary_themes: bookDocument.primaryThemes,
    main_characters: bookDocument.mainCharacters,
    key_locations: bookDocument.keyLocations,
    related_plot_threads: bookDocument.relatedPlotThreads,
    chapter_ids: bookDocument.chapterIds,
    scene_ids: bookDocument.sceneIds,
    timeline_event_ids: bookDocument.timelineEventIds,
    public_wiki_summary: bookDocument.publicWikiSummary,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw error;
  }

  return bookId;
}

export async function updateBookForProject(
  uid: string,
  projectId: string,
  bookId: string,
  values: NormalizedBookFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Book title is required.");
  }

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("books")
    .update({
      title,
      slug: slugifyBookTitle(title),
      summary: values.summary,
      description: values.description,
      status: values.status,
      is_archived: values.status === "archived",
      series_order: values.seriesOrder,
      internal_chronology_start: values.internalChronologyStart,
      internal_chronology_end: values.internalChronologyEnd,
      premise: values.premise,
      draft_stage: values.draftStage,
      word_count_target: values.wordCountTarget,
      public_wiki_summary: values.publicWikiSummary,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", bookId);

  if (error) {
    throw error;
  }
}

export async function updateBookPenNameForProject(
  uid: string,
  projectId: string,
  bookId: string,
  penName: string | null
) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("books")
    .update({
      pen_name: penName,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", bookId);

  if (error) {
    throw error;
  }
}

async function getAvailableBookId(uid: string, projectId: string, title: string) {
  const baseId = buildBookId(title);
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("books")
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

function normalizeBookRow(row: BookRow): Book {
  const status = coerceBookStatus(row.status);

  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    slug: row.slug || slugifyBookTitle(row.title),
    penName: row.pen_name ?? null,
    summary: row.summary || "",
    description: row.description || "",
    status,
    tags: row.tags ?? [],
    isArchived: row.is_archived ?? status === "archived",
    canonLevel: coerceBookCanonLevel(row.canon_level),
    confidence: coerceBookConfidence(row.confidence),
    seriesOrder: row.series_order,
    internalChronologyStart: row.internal_chronology_start,
    internalChronologyEnd: row.internal_chronology_end,
    premise: row.premise || "",
    draftStage: coerceBookDraftStage(row.draft_stage),
    wordCountTarget: row.word_count_target,
    wordCountCurrent: row.word_count_current ?? 0,
    primaryThemes: row.primary_themes ?? [],
    mainCharacters: row.main_characters ?? [],
    keyLocations: row.key_locations ?? [],
    relatedPlotThreads: row.related_plot_threads ?? [],
    chapterIds: row.chapter_ids ?? [],
    sceneIds: row.scene_ids ?? [],
    timelineEventIds: row.timeline_event_ids ?? [],
    publicWikiSummary: row.public_wiki_summary || "",
    createdAt: readDateOrNull(row.created_at),
    updatedAt: readDateOrNull(row.updated_at),
  };
}

function buildBookId(title: string) {
  const normalized = slugifyBookTitle(title).replace(/-/g, "_");
  return `book_${normalized || "book"}`;
}

function compareBooks(left: Book, right: Book) {
  if (typeof left.seriesOrder === "number" && typeof right.seriesOrder === "number") {
    if (left.seriesOrder !== right.seriesOrder) {
      return left.seriesOrder - right.seriesOrder;
    }
  } else if (typeof left.seriesOrder === "number") {
    return -1;
  } else if (typeof right.seriesOrder === "number") {
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
