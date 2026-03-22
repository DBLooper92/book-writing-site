import "client-only";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";
import {
  buildOutlineDocument,
  coerceOutlineCanonLevel,
  coerceOutlineConfidence,
  coerceOutlineStatus,
  slugifyOutlineTitle,
  type NormalizedOutlineFormValues,
  type Outline,
} from "@/types/outline";

type OutlineRow = Database["public"]["Tables"]["outlines"]["Row"];

export async function getOutlinesForProject(uid: string, projectId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("outlines")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => normalizeOutlineRow(row as OutlineRow)).sort(compareOutlines);
}

export async function getOutlineById(uid: string, projectId: string, outlineId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("outlines")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", outlineId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeOutlineRow(data as OutlineRow) : null;
}

export async function createOutlineForProject(
  uid: string,
  projectId: string,
  values: NormalizedOutlineFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Outline title is required.");
  }

  const outlineId = await getAvailableOutlineId(uid, projectId, title);
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();
  const outlineDocument = buildOutlineDocument({
    id: outlineId,
    projectId,
    values,
  });

  const { error } = await supabase.from("outlines").insert({
    user_id: uid,
    project_id: projectId,
    id: outlineId,
    title: outlineDocument.title,
    slug: outlineDocument.slug,
    summary: outlineDocument.summary,
    description: outlineDocument.description,
    status: outlineDocument.status,
    tags: outlineDocument.tags,
    is_archived: outlineDocument.isArchived,
    canon_level: outlineDocument.canonLevel,
    confidence: outlineDocument.confidence,
    outline_type: outlineDocument.outlineType,
    scope: outlineDocument.scope,
    act_structure: outlineDocument.actStructure,
    milestones: outlineDocument.milestones,
    book_ids: outlineDocument.bookIds,
    thread_ids: outlineDocument.threadIds,
    note_ids: outlineDocument.noteIds,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw error;
  }

  return outlineId;
}

export async function updateOutlineForProject(
  uid: string,
  projectId: string,
  outlineId: string,
  values: NormalizedOutlineFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Outline title is required.");
  }

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("outlines")
    .update({
      title,
      slug: slugifyOutlineTitle(title),
      summary: values.summary,
      description: values.description,
      status: values.status,
      is_archived: values.status === "archived",
      outline_type: values.outlineType,
      scope: values.scope,
      act_structure: values.actStructure,
      milestones: values.milestones,
      book_ids: values.bookIds,
      thread_ids: values.threadIds,
      note_ids: values.noteIds,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", outlineId);

  if (error) {
    throw error;
  }
}

async function getAvailableOutlineId(uid: string, projectId: string, title: string) {
  const baseId = buildOutlineId(title);
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("outlines")
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

function normalizeOutlineRow(row: OutlineRow): Outline {
  const status = coerceOutlineStatus(row.status);

  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    slug: row.slug || slugifyOutlineTitle(row.title),
    summary: row.summary || "",
    description: row.description || "",
    status,
    tags: row.tags ?? [],
    isArchived: row.is_archived ?? status === "archived",
    canonLevel: coerceOutlineCanonLevel(row.canon_level),
    confidence: coerceOutlineConfidence(row.confidence),
    outlineType: row.outline_type || "outline",
    scope: row.scope || "",
    actStructure: row.act_structure ?? [],
    milestones: row.milestones ?? [],
    bookIds: row.book_ids ?? [],
    threadIds: row.thread_ids ?? [],
    noteIds: row.note_ids ?? [],
    createdAt: readDateOrNull(row.created_at),
    updatedAt: readDateOrNull(row.updated_at),
  };
}

function buildOutlineId(title: string) {
  const normalized = slugifyOutlineTitle(title).replace(/-/g, "_");
  return `outline_${normalized || "outline"}`;
}

function compareOutlines(left: Outline, right: Outline) {
  return left.title.localeCompare(right.title);
}

function readDateOrNull(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
