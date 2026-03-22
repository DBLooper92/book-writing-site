import "client-only";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";
import {
  buildAttachmentDocument,
  coerceAttachmentCanonLevel,
  coerceAttachmentConfidence,
  coerceAttachmentStatus,
  coerceAttachmentStorageStatus,
  coerceAttachmentType,
  slugifyAttachmentTitle,
  type Attachment,
  type NormalizedAttachmentFormValues,
} from "@/types/attachment";

type AttachmentRow = Database["public"]["Tables"]["attachments"]["Row"];

export async function getAttachmentsForProject(uid: string, projectId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("attachments")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId);

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => normalizeAttachmentRow(row as AttachmentRow))
    .sort(compareAttachments);
}

export async function getAttachmentById(uid: string, projectId: string, attachmentId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("attachments")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", attachmentId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeAttachmentRow(data as AttachmentRow) : null;
}

export async function createAttachmentForProject(
  uid: string,
  projectId: string,
  values: NormalizedAttachmentFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Attachment title is required.");
  }

  const attachmentId = await getAvailableAttachmentId(uid, projectId, title);
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();
  const attachmentDocument = buildAttachmentDocument({
    id: attachmentId,
    projectId,
    values,
  });

  const { error } = await supabase.from("attachments").insert({
    user_id: uid,
    project_id: projectId,
    id: attachmentId,
    title: attachmentDocument.title,
    slug: attachmentDocument.slug,
    summary: attachmentDocument.summary,
    description: attachmentDocument.description,
    status: attachmentDocument.status,
    tags: attachmentDocument.tags,
    is_archived: attachmentDocument.isArchived,
    canon_level: attachmentDocument.canonLevel,
    confidence: attachmentDocument.confidence,
    attachment_type: attachmentDocument.attachmentType,
    storage_status: attachmentDocument.storageStatus,
    file_name: attachmentDocument.fileName,
    mime_type: attachmentDocument.mimeType,
    source_note: attachmentDocument.sourceNote,
    url: attachmentDocument.url,
    linked_entity_type: attachmentDocument.linkedEntityType,
    linked_entity_id: attachmentDocument.linkedEntityId,
    linked_note_ids: attachmentDocument.linkedNoteIds,
    linked_outline_ids: attachmentDocument.linkedOutlineIds,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw error;
  }

  return attachmentId;
}

export async function updateAttachmentForProject(
  uid: string,
  projectId: string,
  attachmentId: string,
  values: NormalizedAttachmentFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Attachment title is required.");
  }

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("attachments")
    .update({
      title,
      slug: slugifyAttachmentTitle(title),
      summary: values.summary,
      description: values.description,
      status: values.status,
      is_archived: values.status === "archived",
      attachment_type: values.attachmentType,
      storage_status: values.storageStatus,
      file_name: values.fileName,
      mime_type: values.mimeType,
      source_note: values.sourceNote,
      url: values.url,
      linked_entity_type: values.linkedEntityType,
      linked_entity_id: values.linkedEntityId,
      linked_note_ids: values.linkedNoteIds,
      linked_outline_ids: values.linkedOutlineIds,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", attachmentId);

  if (error) {
    throw error;
  }
}

async function getAvailableAttachmentId(uid: string, projectId: string, title: string) {
  const baseId = buildAttachmentId(title);
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("attachments")
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

function normalizeAttachmentRow(row: AttachmentRow): Attachment {
  const status = coerceAttachmentStatus(row.status);

  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    slug: row.slug || slugifyAttachmentTitle(row.title),
    summary: row.summary || "",
    description: row.description || "",
    status,
    tags: row.tags ?? [],
    isArchived: row.is_archived ?? status === "archived",
    canonLevel: coerceAttachmentCanonLevel(row.canon_level),
    confidence: coerceAttachmentConfidence(row.confidence),
    attachmentType: coerceAttachmentType(row.attachment_type),
    storageStatus: coerceAttachmentStorageStatus(row.storage_status),
    fileName: row.file_name || "",
    mimeType: row.mime_type || "",
    sourceNote: row.source_note || "",
    url: row.url,
    linkedEntityType: row.linked_entity_type,
    linkedEntityId: row.linked_entity_id,
    linkedNoteIds: row.linked_note_ids ?? [],
    linkedOutlineIds: row.linked_outline_ids ?? [],
    createdAt: readDateOrNull(row.created_at),
    updatedAt: readDateOrNull(row.updated_at),
  };
}

function buildAttachmentId(title: string) {
  const normalized = slugifyAttachmentTitle(title).replace(/-/g, "_");
  return `attachment_${normalized || "attachment"}`;
}

function compareAttachments(left: Attachment, right: Attachment) {
  return left.title.localeCompare(right.title);
}

function readDateOrNull(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
