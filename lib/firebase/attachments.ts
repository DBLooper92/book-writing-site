import "client-only";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
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

export function getAttachmentDocPath(uid: string, projectId: string, attachmentId: string) {
  return doc(db, "users", uid, "projects", projectId, "attachments", attachmentId).path;
}

export function observeAttachmentsForProject(
  uid: string,
  projectId: string,
  callback: (attachments: Attachment[]) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const attachmentsRef = collection(db, "users", uid, "projects", projectId, "attachments");

  return onSnapshot(
    attachmentsRef,
    (snapshot) => {
      const attachments = snapshot.docs
        .map((attachmentDoc) =>
          normalizeAttachmentDocument(attachmentDoc.id, projectId, attachmentDoc.data())
        )
        .sort((left, right) => left.title.localeCompare(right.title));

      callback(attachments);
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export function observeAttachmentById(
  uid: string,
  projectId: string,
  attachmentId: string,
  callback: (attachment: Attachment | null) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const attachmentRef = doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "attachments",
    attachmentId
  );

  return onSnapshot(
    attachmentRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback(normalizeAttachmentDocument(snapshot.id, projectId, snapshot.data()));
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export async function getAttachmentById(
  uid: string,
  projectId: string,
  attachmentId: string
) {
  const attachmentRef = doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "attachments",
    attachmentId
  );
  const snapshot = await getDoc(attachmentRef);

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeAttachmentDocument(snapshot.id, projectId, snapshot.data());
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
  const attachmentRef = doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "attachments",
    attachmentId
  );
  const attachmentDocument = buildAttachmentDocument({
    id: attachmentId,
    projectId,
    values,
  });

  await setDoc(attachmentRef, {
    ...attachmentDocument,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

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

  const attachmentRef = doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "attachments",
    attachmentId
  );

  await setDoc(
    attachmentRef,
    {
      projectId,
      title,
      slug: slugifyAttachmentTitle(title),
      summary: values.summary,
      description: values.description,
      status: values.status,
      isArchived: values.status === "archived",
      attachmentType: values.attachmentType,
      storageStatus: values.storageStatus,
      fileName: values.fileName,
      mimeType: values.mimeType,
      sourceNote: values.sourceNote,
      url: values.url,
      linkedEntityType: values.linkedEntityType,
      linkedEntityId: values.linkedEntityId,
      linkedNoteIds: values.linkedNoteIds,
      linkedOutlineIds: values.linkedOutlineIds,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

function normalizeAttachmentDocument(
  documentId: string,
  projectId: string,
  data: Record<string, unknown> | undefined
): Attachment {
  const status = coerceAttachmentStatus(data?.status);
  const explicitIsArchived = readBooleanOrNull(data?.isArchived);

  return {
    id: documentId,
    projectId: readString(data?.projectId) ?? projectId,
    title: readString(data?.title) ?? documentId,
    slug:
      readString(data?.slug) ??
      slugifyAttachmentTitle(readString(data?.title) ?? documentId),
    summary: readString(data?.summary) ?? "",
    description: readString(data?.description) ?? "",
    status,
    tags: readStringArray(data?.tags),
    isArchived: explicitIsArchived ?? status === "archived",
    canonLevel: coerceAttachmentCanonLevel(data?.canonLevel),
    confidence: coerceAttachmentConfidence(data?.confidence),
    attachmentType: coerceAttachmentType(data?.attachmentType),
    storageStatus: coerceAttachmentStorageStatus(data?.storageStatus),
    fileName: readString(data?.fileName) ?? "",
    mimeType: readString(data?.mimeType) ?? "",
    sourceNote: readString(data?.sourceNote) ?? "",
    url: readNullableString(data?.url),
    linkedEntityType: readNullableString(data?.linkedEntityType),
    linkedEntityId: readNullableString(data?.linkedEntityId),
    linkedNoteIds: readStringArray(data?.linkedNoteIds),
    linkedOutlineIds: readStringArray(data?.linkedOutlineIds),
    createdAt: readTimestamp(data?.createdAt),
    updatedAt: readTimestamp(data?.updatedAt),
  };
}

async function getAvailableAttachmentId(uid: string, projectId: string, title: string) {
  const baseId = buildAttachmentId(title);
  let candidateId = baseId;
  let suffix = 2;

  while (
    (
      await getDoc(doc(db, "users", uid, "projects", projectId, "attachments", candidateId))
    ).exists()
  ) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}

function buildAttachmentId(title: string) {
  const normalized = slugifyAttachmentTitle(title).replace(/-/g, "_");
  return `attachment_${normalized || "attachment"}`;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readStringArray(value: unknown) {
  if (typeof value === "string") {
    return value.trim() ? [value.trim()] : [];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function readBooleanOrNull(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function readTimestamp(value: unknown) {
  return value instanceof Timestamp ? value : null;
}
