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
  buildOutlineDocument,
  coerceOutlineCanonLevel,
  coerceOutlineConfidence,
  coerceOutlineStatus,
  slugifyOutlineTitle,
  type NormalizedOutlineFormValues,
  type Outline,
} from "@/types/outline";

export function getOutlineDocPath(uid: string, projectId: string, outlineId: string) {
  return doc(db, "users", uid, "projects", projectId, "outlines", outlineId).path;
}

export function observeOutlinesForProject(
  uid: string,
  projectId: string,
  callback: (outlines: Outline[]) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const outlinesRef = collection(db, "users", uid, "projects", projectId, "outlines");

  return onSnapshot(
    outlinesRef,
    (snapshot) => {
      const outlines = snapshot.docs
        .map((outlineDoc) => normalizeOutlineDocument(outlineDoc.id, projectId, outlineDoc.data()))
        .sort((left, right) => left.title.localeCompare(right.title));

      callback(outlines);
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export function observeOutlineById(
  uid: string,
  projectId: string,
  outlineId: string,
  callback: (outline: Outline | null) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const outlineRef = doc(db, "users", uid, "projects", projectId, "outlines", outlineId);

  return onSnapshot(
    outlineRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback(normalizeOutlineDocument(snapshot.id, projectId, snapshot.data()));
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export async function getOutlineById(uid: string, projectId: string, outlineId: string) {
  const outlineRef = doc(db, "users", uid, "projects", projectId, "outlines", outlineId);
  const snapshot = await getDoc(outlineRef);

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeOutlineDocument(snapshot.id, projectId, snapshot.data());
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
  const outlineRef = doc(db, "users", uid, "projects", projectId, "outlines", outlineId);
  const outlineDocument = buildOutlineDocument({
    id: outlineId,
    projectId,
    values,
  });

  await setDoc(outlineRef, {
    ...outlineDocument,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

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

  const outlineRef = doc(db, "users", uid, "projects", projectId, "outlines", outlineId);

  await setDoc(
    outlineRef,
    {
      projectId,
      title,
      slug: slugifyOutlineTitle(title),
      summary: values.summary,
      description: values.description,
      status: values.status,
      isArchived: values.status === "archived",
      outlineType: values.outlineType,
      scope: values.scope,
      actStructure: values.actStructure,
      milestones: values.milestones,
      bookIds: values.bookIds,
      threadIds: values.threadIds,
      noteIds: values.noteIds,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

function normalizeOutlineDocument(
  documentId: string,
  projectId: string,
  data: Record<string, unknown> | undefined
): Outline {
  const status = coerceOutlineStatus(data?.status);
  const explicitIsArchived = readBooleanOrNull(data?.isArchived);

  return {
    id: documentId,
    projectId: readString(data?.projectId) ?? projectId,
    title: readString(data?.title) ?? documentId,
    slug: readString(data?.slug) ?? slugifyOutlineTitle(readString(data?.title) ?? documentId),
    summary: readString(data?.summary) ?? "",
    description: readString(data?.description) ?? "",
    status,
    tags: readStringArray(data?.tags),
    isArchived: explicitIsArchived ?? status === "archived",
    canonLevel: coerceOutlineCanonLevel(data?.canonLevel),
    confidence: coerceOutlineConfidence(data?.confidence),
    outlineType: readString(data?.outlineType) ?? "outline",
    scope: readString(data?.scope) ?? "",
    actStructure: readStringArray(data?.actStructure),
    milestones: readStringArray(data?.milestones),
    bookIds: readStringArray(data?.bookIds),
    threadIds: readStringArray(data?.threadIds),
    noteIds: readStringArray(data?.noteIds),
    createdAt: readTimestamp(data?.createdAt),
    updatedAt: readTimestamp(data?.updatedAt),
  };
}

async function getAvailableOutlineId(uid: string, projectId: string, title: string) {
  const baseId = buildOutlineId(title);
  let candidateId = baseId;
  let suffix = 2;

  while (
    (await getDoc(doc(db, "users", uid, "projects", projectId, "outlines", candidateId))).exists()
  ) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}

function buildOutlineId(title: string) {
  const normalized = slugifyOutlineTitle(title).replace(/-/g, "_");
  return `outline_${normalized || "outline"}`;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
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
