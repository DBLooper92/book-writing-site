import "client-only";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";
import {
  buildPlotThreadDocument,
  coercePlotThreadCanonLevel,
  coercePlotThreadConfidence,
  coercePlotThreadStatus,
  coercePlotThreadType,
  slugifyPlotThreadTitle,
  type NormalizedPlotThreadFormValues,
  type PlotThread,
} from "@/types/plot-thread";

type PlotThreadRow = Database["public"]["Tables"]["plot_threads"]["Row"];

export async function getPlotThreadsForProject(uid: string, projectId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("plot_threads")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId);

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => normalizePlotThreadRow(row as PlotThreadRow))
    .sort(comparePlotThreads);
}

export async function getPlotThreadById(
  uid: string,
  projectId: string,
  plotThreadId: string
) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("plot_threads")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", plotThreadId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizePlotThreadRow(data as PlotThreadRow) : null;
}

export async function createPlotThreadForProject(
  uid: string,
  projectId: string,
  values: NormalizedPlotThreadFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Plot thread title is required.");
  }

  const plotThreadId = await getAvailablePlotThreadId(uid, projectId, title);
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();
  const plotThreadDocument = buildPlotThreadDocument({
    id: plotThreadId,
    projectId,
    values,
  });

  const { error } = await supabase.from("plot_threads").insert({
    user_id: uid,
    project_id: projectId,
    id: plotThreadId,
    title: plotThreadDocument.title,
    slug: plotThreadDocument.slug,
    summary: plotThreadDocument.summary,
    description: plotThreadDocument.description,
    status: plotThreadDocument.status,
    tags: plotThreadDocument.tags,
    is_archived: plotThreadDocument.isArchived,
    canon_level: plotThreadDocument.canonLevel,
    confidence: plotThreadDocument.confidence,
    thread_type: plotThreadDocument.threadType,
    introduced_in_book_id: plotThreadDocument.introducedInBookId,
    resolved_in_book_id: plotThreadDocument.resolvedInBookId,
    character_ids: plotThreadDocument.characterIds,
    timeline_event_ids: plotThreadDocument.timelineEventIds,
    book_ids: plotThreadDocument.bookIds,
    chapter_ids: plotThreadDocument.chapterIds,
    scene_ids: plotThreadDocument.sceneIds,
    theme_ids: plotThreadDocument.themeIds,
    note_ids: plotThreadDocument.noteIds,
    setup_notes: plotThreadDocument.setupNotes,
    payoff_notes: plotThreadDocument.payoffNotes,
    open_questions: plotThreadDocument.openQuestions,
    public_wiki_summary: plotThreadDocument.publicWikiSummary,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw error;
  }

  return plotThreadId;
}

export async function updatePlotThreadForProject(
  uid: string,
  projectId: string,
  plotThreadId: string,
  values: NormalizedPlotThreadFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Plot thread title is required.");
  }

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("plot_threads")
    .update({
      title,
      slug: slugifyPlotThreadTitle(title),
      summary: values.summary,
      description: values.description,
      status: values.status,
      is_archived: values.status === "archived",
      thread_type: values.threadType,
      introduced_in_book_id: values.introducedInBookId,
      resolved_in_book_id: values.resolvedInBookId,
      character_ids: values.characterIds,
      timeline_event_ids: values.timelineEventIds,
      book_ids: values.bookIds,
      chapter_ids: values.chapterIds,
      setup_notes: values.setupNotes,
      payoff_notes: values.payoffNotes,
      open_questions: values.openQuestions,
      public_wiki_summary: values.publicWikiSummary,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", plotThreadId);

  if (error) {
    throw error;
  }
}

async function getAvailablePlotThreadId(uid: string, projectId: string, title: string) {
  const baseId = buildPlotThreadId(title);
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("plot_threads")
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

function normalizePlotThreadRow(row: PlotThreadRow): PlotThread {
  const status = coercePlotThreadStatus(row.status);

  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    slug: row.slug || slugifyPlotThreadTitle(row.title),
    summary: row.summary || "",
    description: row.description || "",
    status,
    tags: row.tags ?? [],
    isArchived: row.is_archived ?? status === "archived",
    canonLevel: coercePlotThreadCanonLevel(row.canon_level),
    confidence: coercePlotThreadConfidence(row.confidence),
    threadType: coercePlotThreadType(row.thread_type),
    introducedInBookId: row.introduced_in_book_id,
    resolvedInBookId: row.resolved_in_book_id,
    characterIds: row.character_ids ?? [],
    timelineEventIds: row.timeline_event_ids ?? [],
    bookIds: row.book_ids ?? [],
    chapterIds: row.chapter_ids ?? [],
    sceneIds: row.scene_ids ?? [],
    themeIds: row.theme_ids ?? [],
    noteIds: row.note_ids ?? [],
    setupNotes: row.setup_notes ?? [],
    payoffNotes: row.payoff_notes ?? [],
    openQuestions: row.open_questions ?? [],
    publicWikiSummary: row.public_wiki_summary || "",
    createdAt: readDateOrNull(row.created_at),
    updatedAt: readDateOrNull(row.updated_at),
  };
}

function buildPlotThreadId(title: string) {
  const normalized = slugifyPlotThreadTitle(title).replace(/-/g, "_");
  return `thread_${normalized || "thread"}`;
}

function comparePlotThreads(left: PlotThread, right: PlotThread) {
  return left.title.localeCompare(right.title);
}

function readDateOrNull(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
