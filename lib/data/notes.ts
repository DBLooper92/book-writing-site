import "client-only";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";
import {
  buildNoteDocument,
  coerceNoteCanonLevel,
  coerceNoteConfidence,
  coerceNoteStatus,
  slugifyNoteTitle,
  type Note,
  type NormalizedNoteFormValues,
} from "@/types/note";

type NoteRow = Database["public"]["Tables"]["notes"]["Row"];

export async function getNotesForProject(uid: string, projectId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => normalizeNoteRow(row as NoteRow)).sort(compareNotes);
}

export async function getNoteById(uid: string, projectId: string, noteId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", noteId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeNoteRow(data as NoteRow) : null;
}

export async function createNoteForProject(
  uid: string,
  projectId: string,
  values: NormalizedNoteFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Note title is required.");
  }

  const noteId = await getAvailableNoteId(uid, projectId, title);
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();
  const noteDocument = buildNoteDocument({
    id: noteId,
    projectId,
    values,
  });

  const { error } = await supabase.from("notes").insert({
    user_id: uid,
    project_id: projectId,
    id: noteId,
    title: noteDocument.title,
    slug: noteDocument.slug,
    summary: noteDocument.summary,
    description: noteDocument.description,
    status: noteDocument.status,
    tags: noteDocument.tags,
    is_archived: noteDocument.isArchived,
    canon_level: noteDocument.canonLevel,
    confidence: noteDocument.confidence,
    content: noteDocument.content,
    note_type: noteDocument.noteType,
    linked_entity_type: noteDocument.linkedEntityType,
    linked_entity_id: noteDocument.linkedEntityId,
    linked_book_ids: noteDocument.linkedBookIds,
    linked_chapter_ids: noteDocument.linkedChapterIds,
    linked_character_ids: noteDocument.linkedCharacterIds,
    linked_location_ids: noteDocument.linkedLocationIds,
    linked_event_ids: noteDocument.linkedEventIds,
    linked_thread_ids: noteDocument.linkedThreadIds,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw error;
  }

  return noteId;
}

export async function updateNoteForProject(
  uid: string,
  projectId: string,
  noteId: string,
  values: NormalizedNoteFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Note title is required.");
  }

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("notes")
    .update({
      title,
      slug: slugifyNoteTitle(title),
      summary: values.summary,
      description: values.description,
      content: values.content,
      status: values.status,
      is_archived: values.status === "archived",
      note_type: values.noteType,
      linked_entity_type: values.linkedEntityType,
      linked_entity_id: values.linkedEntityId,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", noteId);

  if (error) {
    throw error;
  }
}

async function getAvailableNoteId(uid: string, projectId: string, title: string) {
  const baseId = buildNoteId(title);
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("notes")
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

function normalizeNoteRow(row: NoteRow): Note {
  const status = coerceNoteStatus(row.status);

  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    slug: row.slug || slugifyNoteTitle(row.title),
    summary: row.summary || "",
    description: row.description || "",
    status,
    tags: row.tags ?? [],
    isArchived: row.is_archived ?? status === "archived",
    canonLevel: coerceNoteCanonLevel(row.canon_level),
    confidence: coerceNoteConfidence(row.confidence),
    content: row.content || "",
    noteType: row.note_type || "general",
    linkedEntityType: row.linked_entity_type,
    linkedEntityId: row.linked_entity_id,
    linkedBookIds: row.linked_book_ids ?? [],
    linkedChapterIds: row.linked_chapter_ids ?? [],
    linkedCharacterIds: row.linked_character_ids ?? [],
    linkedLocationIds: row.linked_location_ids ?? [],
    linkedEventIds: row.linked_event_ids ?? [],
    linkedThreadIds: row.linked_thread_ids ?? [],
    createdAt: readDateOrNull(row.created_at),
    updatedAt: readDateOrNull(row.updated_at),
  };
}

function buildNoteId(title: string) {
  const normalized = slugifyNoteTitle(title).replace(/-/g, "_");
  return `note_${normalized || "note"}`;
}

function compareNotes(left: Note, right: Note) {
  return left.title.localeCompare(right.title);
}

function readDateOrNull(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
