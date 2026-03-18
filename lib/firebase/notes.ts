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
  buildNoteDocument,
  coerceNoteCanonLevel,
  coerceNoteConfidence,
  coerceNoteStatus,
  slugifyNoteTitle,
  type Note,
  type NormalizedNoteFormValues,
} from "@/types/note";

export function getNoteDocPath(uid: string, projectId: string, noteId: string) {
  return doc(db, "users", uid, "projects", projectId, "notes", noteId).path;
}

export function observeNotesForProject(
  uid: string,
  projectId: string,
  callback: (notes: Note[]) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const notesRef = collection(db, "users", uid, "projects", projectId, "notes");

  return onSnapshot(
    notesRef,
    (snapshot) => {
      const notes = snapshot.docs
        .map((noteDoc) => normalizeNoteDocument(noteDoc.id, projectId, noteDoc.data()))
        .sort((left, right) => left.title.localeCompare(right.title));

      callback(notes);
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export function observeNoteById(
  uid: string,
  projectId: string,
  noteId: string,
  callback: (note: Note | null) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const noteRef = doc(db, "users", uid, "projects", projectId, "notes", noteId);

  return onSnapshot(
    noteRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback(normalizeNoteDocument(snapshot.id, projectId, snapshot.data()));
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export async function getNoteById(uid: string, projectId: string, noteId: string) {
  const noteRef = doc(db, "users", uid, "projects", projectId, "notes", noteId);
  const snapshot = await getDoc(noteRef);

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeNoteDocument(snapshot.id, projectId, snapshot.data());
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
  const noteRef = doc(db, "users", uid, "projects", projectId, "notes", noteId);
  const noteDocument = buildNoteDocument({
    id: noteId,
    projectId,
    values,
  });

  await setDoc(noteRef, {
    ...noteDocument,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

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

  const noteRef = doc(db, "users", uid, "projects", projectId, "notes", noteId);

  await setDoc(
    noteRef,
    {
      projectId,
      title,
      slug: slugifyNoteTitle(title),
      summary: values.summary,
      description: values.description,
      content: values.content,
      status: values.status,
      isArchived: values.status === "archived",
      noteType: values.noteType,
      linkedEntityType: values.linkedEntityType,
      linkedEntityId: values.linkedEntityId,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

function normalizeNoteDocument(
  documentId: string,
  projectId: string,
  data: Record<string, unknown> | undefined
): Note {
  const status = coerceNoteStatus(data?.status);
  const explicitIsArchived = readBooleanOrNull(data?.isArchived);

  return {
    id: documentId,
    projectId: readString(data?.projectId) ?? projectId,
    title: readString(data?.title) ?? documentId,
    slug: readString(data?.slug) ?? slugifyNoteTitle(readString(data?.title) ?? documentId),
    summary: readString(data?.summary) ?? "",
    description: readString(data?.description) ?? "",
    status,
    tags: readStringArray(data?.tags),
    isArchived: explicitIsArchived ?? status === "archived",
    canonLevel: coerceNoteCanonLevel(data?.canonLevel),
    confidence: coerceNoteConfidence(data?.confidence),
    content: readString(data?.content) ?? "",
    noteType: readString(data?.noteType) ?? "general",
    linkedEntityType: readNullableString(data?.linkedEntityType),
    linkedEntityId: readNullableString(data?.linkedEntityId),
    linkedBookIds: readStringArray(data?.linkedBookIds),
    linkedChapterIds: readStringArray(data?.linkedChapterIds),
    linkedCharacterIds: readStringArray(data?.linkedCharacterIds),
    linkedLocationIds: readStringArray(data?.linkedLocationIds),
    linkedEventIds: readStringArray(data?.linkedEventIds),
    linkedThreadIds: readStringArray(data?.linkedThreadIds),
    createdAt: readTimestamp(data?.createdAt),
    updatedAt: readTimestamp(data?.updatedAt),
  };
}

async function getAvailableNoteId(uid: string, projectId: string, title: string) {
  const baseId = buildNoteId(title);
  let candidateId = baseId;
  let suffix = 2;

  while (
    (await getDoc(doc(db, "users", uid, "projects", projectId, "notes", candidateId))).exists()
  ) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}

function buildNoteId(title: string) {
  const normalized = slugifyNoteTitle(title).replace(/-/g, "_");
  return `note_${normalized || "note"}`;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
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
