import "client-only";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";
import {
  ATTACHMENT_DOCUMENT_ALLOWED_MIME_TYPES,
  ATTACHMENT_DOCUMENT_BUCKET_ID,
  ATTACHMENT_DOCUMENT_MAX_FILE_SIZE_BYTES,
  ATTACHMENT_IMAGE_ALLOWED_MIME_TYPES,
  ATTACHMENT_IMAGE_BUCKET_ID,
  ATTACHMENT_IMAGE_MAX_FILE_SIZE_BYTES,
} from "@/lib/data/attachment-storage";
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

export {
  ATTACHMENT_DOCUMENT_ALLOWED_MIME_TYPES,
  ATTACHMENT_DOCUMENT_BUCKET_ID,
  ATTACHMENT_DOCUMENT_MAX_FILE_SIZE_BYTES,
  ATTACHMENT_IMAGE_ALLOWED_MIME_TYPES,
  ATTACHMENT_IMAGE_BUCKET_ID,
  ATTACHMENT_IMAGE_MAX_FILE_SIZE_BYTES,
};

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

export async function getImageAttachmentsForEntity(
  uid: string,
  projectId: string,
  entityType: string,
  entityId: string
) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("attachments")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("attachment_type", "image")
    .eq("linked_entity_type", entityType)
    .eq("linked_entity_id", entityId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => normalizeAttachmentRow(row as AttachmentRow))
    .sort(compareImageAttachments);
}

export async function getAttachmentFileUrl(
  attachment: Pick<Attachment, "storageBucket" | "storagePath" | "url">,
  expiresInSeconds = 60 * 60
) {
  if (attachment.storageBucket && attachment.storagePath) {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.storage
      .from(attachment.storageBucket)
      .createSignedUrl(attachment.storagePath, expiresInSeconds);

    if (error) {
      throw error;
    }

    return data.signedUrl;
  }

  return attachment.url;
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
    storage_bucket: attachmentDocument.storageBucket,
    storage_path: attachmentDocument.storagePath,
    file_size_bytes: attachmentDocument.fileSizeBytes,
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
  const { data: currentRow, error: currentRowError } = await supabase
    .from("attachments")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", attachmentId)
    .maybeSingle();

  if (currentRowError) {
    throw currentRowError;
  }

  if (!currentRow) {
    throw new Error("Attachment not found in the active project.");
  }

  const currentAttachment = normalizeAttachmentRow(currentRow as AttachmentRow);
  const isStorageManaged =
    Boolean(currentAttachment.storageBucket) && Boolean(currentAttachment.storagePath);

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
      storage_status: isStorageManaged ? currentAttachment.storageStatus : values.storageStatus,
      file_name: isStorageManaged ? currentAttachment.fileName : values.fileName,
      mime_type: isStorageManaged ? currentAttachment.mimeType : values.mimeType,
      source_note: values.sourceNote,
      url: isStorageManaged ? currentAttachment.url : values.url,
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

export async function uploadImageAttachmentForEntity(
  uid: string,
  projectId: string,
  entityType: string,
  entityId: string,
  file: File
) {
  validateImageFile(file);

  const attachmentTitle = buildAttachmentTitleFromFileName(file.name);
  const attachmentId = await getAvailableAttachmentId(uid, projectId, attachmentTitle);
  const storagePath = buildAttachmentImageStoragePath({
    uid,
    projectId,
    entityType,
    entityId,
    attachmentId,
    fileName: file.name,
  });
  const supabase = getSupabaseBrowserClient();
  const { error: uploadError } = await supabase.storage
    .from(ATTACHMENT_IMAGE_BUCKET_ID)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });

  if (uploadError) {
    throw uploadError;
  }

  const now = new Date().toISOString();
  const sourceNote = `Uploaded from ${entityType}/${entityId}.`;
  const { error: insertError } = await supabase.from("attachments").insert({
    user_id: uid,
    project_id: projectId,
    id: attachmentId,
    title: attachmentTitle,
    slug: slugifyAttachmentTitle(attachmentTitle),
    summary: "",
    description: "",
    status: "active",
    tags: [],
    is_archived: false,
    canon_level: "working",
    confidence: "medium",
    attachment_type: "image",
    storage_status: "uploaded",
    file_name: file.name,
    mime_type: file.type || "",
    source_note: sourceNote,
    url: null,
    storage_bucket: ATTACHMENT_IMAGE_BUCKET_ID,
    storage_path: storagePath,
    file_size_bytes: file.size,
    linked_entity_type: entityType,
    linked_entity_id: entityId,
    linked_note_ids: [],
    linked_outline_ids: [],
    created_at: now,
    updated_at: now,
  });

  if (insertError) {
    await supabase.storage.from(ATTACHMENT_IMAGE_BUCKET_ID).remove([storagePath]);
    throw insertError;
  }

  return attachmentId;
}

export async function uploadDocumentAttachmentForEntity(
  uid: string,
  projectId: string,
  entityType: string,
  entityId: string,
  file: File
) {
  validateDocumentFile(file);

  const attachmentTitle = buildAttachmentTitleFromFileName(file.name);
  const attachmentId = await getAvailableAttachmentId(uid, projectId, attachmentTitle);
  const storagePath = buildAttachmentDocumentStoragePath({
    uid,
    projectId,
    entityType,
    entityId,
    attachmentId,
    fileName: file.name,
  });
  const supabase = getSupabaseBrowserClient();
  const { error: uploadError } = await supabase.storage
    .from(ATTACHMENT_DOCUMENT_BUCKET_ID)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });

  if (uploadError) {
    throw uploadError;
  }

  const now = new Date().toISOString();
  const sourceNote = `Uploaded from ${entityType}/${entityId}.`;
  const { error: insertError } = await supabase.from("attachments").insert({
    user_id: uid,
    project_id: projectId,
    id: attachmentId,
    title: attachmentTitle,
    slug: slugifyAttachmentTitle(attachmentTitle),
    summary: "",
    description: "",
    status: "active",
    tags: [],
    is_archived: false,
    canon_level: "working",
    confidence: "medium",
    attachment_type: "document",
    storage_status: "uploaded",
    file_name: file.name,
    mime_type: file.type || "",
    source_note: sourceNote,
    url: null,
    storage_bucket: ATTACHMENT_DOCUMENT_BUCKET_ID,
    storage_path: storagePath,
    file_size_bytes: file.size,
    linked_entity_type: entityType,
    linked_entity_id: entityId,
    linked_note_ids: [],
    linked_outline_ids: [],
    created_at: now,
    updated_at: now,
  });

  if (insertError) {
    await supabase.storage.from(ATTACHMENT_DOCUMENT_BUCKET_ID).remove([storagePath]);
    throw insertError;
  }

  return attachmentId;
}

export async function deleteAttachmentForProject(
  uid: string,
  projectId: string,
  attachmentId: string
) {
  const attachment = await getAttachmentById(uid, projectId, attachmentId);

  if (!attachment) {
    throw new Error("Attachment not found in the active project.");
  }

  const supabase = getSupabaseBrowserClient();

  if (attachment.storageBucket && attachment.storagePath) {
    const { error: removeError } = await supabase.storage
      .from(attachment.storageBucket)
      .remove([attachment.storagePath]);

    if (removeError) {
      throw removeError;
    }
  }

  const { error } = await supabase
    .from("attachments")
    .delete()
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", attachmentId);

  if (error) {
    if (attachment.storageBucket && attachment.storagePath) {
      await supabase
        .from("attachments")
        .update({
          storage_status: "missing",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", uid)
        .eq("project_id", projectId)
        .eq("id", attachmentId);
    }

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
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    fileSizeBytes: readNumberOrNull(row.file_size_bytes),
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

function compareImageAttachments(left: Attachment, right: Attachment) {
  const leftTime = left.createdAt?.getTime() ?? 0;
  const rightTime = right.createdAt?.getTime() ?? 0;

  if (leftTime !== rightTime) {
    return rightTime - leftTime;
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

function readNumberOrNull(value: number | string | null) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function validateImageFile(file: File) {
  if (!ATTACHMENT_IMAGE_ALLOWED_MIME_TYPES.includes(file.type as (typeof ATTACHMENT_IMAGE_ALLOWED_MIME_TYPES)[number])) {
    throw new Error("Only JPEG, PNG, WebP, GIF, and AVIF images are supported.");
  }

  if (file.size > ATTACHMENT_IMAGE_MAX_FILE_SIZE_BYTES) {
    throw new Error("Each image must be 10 MB or smaller.");
  }
}

function validateDocumentFile(file: File) {
  if (
    !ATTACHMENT_DOCUMENT_ALLOWED_MIME_TYPES.includes(
      file.type as (typeof ATTACHMENT_DOCUMENT_ALLOWED_MIME_TYPES)[number]
    )
  ) {
    throw new Error("Only TXT and DOCX manuscript files are supported.");
  }

  if (file.size > ATTACHMENT_DOCUMENT_MAX_FILE_SIZE_BYTES) {
    throw new Error("Each manuscript file must be 25 MB or smaller.");
  }
}

function buildAttachmentTitleFromFileName(fileName: string) {
  const withoutExtension = fileName.replace(/\.[^/.]+$/, "").trim();
  const normalized = withoutExtension.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return normalized || "Image";
}

function buildAttachmentImageStoragePath({
  uid,
  projectId,
  entityType,
  entityId,
  attachmentId,
  fileName,
}: {
  uid: string;
  projectId: string;
  entityType: string;
  entityId: string;
  attachmentId: string;
  fileName: string;
}) {
  const normalizedFileName = sanitizeStorageFileName(fileName);
  return [uid, projectId, entityType, entityId, attachmentId, normalizedFileName].join("/");
}

function buildAttachmentDocumentStoragePath({
  uid,
  projectId,
  entityType,
  entityId,
  attachmentId,
  fileName,
}: {
  uid: string;
  projectId: string;
  entityType: string;
  entityId: string;
  attachmentId: string;
  fileName: string;
}) {
  const normalizedFileName = sanitizeStorageFileName(fileName);
  return [uid, projectId, entityType, entityId, attachmentId, normalizedFileName].join("/");
}

function sanitizeStorageFileName(fileName: string) {
  const trimmed = fileName.trim();
  const extensionMatch = trimmed.match(/(\.[a-zA-Z0-9]+)$/);
  const extension = extensionMatch ? extensionMatch[1].toLowerCase() : "";
  const baseName = extension ? trimmed.slice(0, -extension.length) : trimmed;
  const normalizedBaseName =
    baseName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "image";

  return `${normalizedBaseName}${extension}`;
}
