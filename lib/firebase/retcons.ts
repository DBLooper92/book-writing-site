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
  buildRetconDocument,
  coerceRetconCanonLevel,
  coerceRetconConfidence,
  coerceRetconImpactLevel,
  coerceRetconStatus,
  slugifyRetconTitle,
  type NormalizedRetconFormValues,
  type Retcon,
} from "@/types/retcon";

export function getRetconDocPath(uid: string, projectId: string, retconId: string) {
  return doc(db, "users", uid, "projects", projectId, "retcons", retconId).path;
}

export function observeRetconsForProject(
  uid: string,
  projectId: string,
  callback: (retcons: Retcon[]) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const retconsRef = collection(db, "users", uid, "projects", projectId, "retcons");

  return onSnapshot(
    retconsRef,
    (snapshot) => {
      const retcons = snapshot.docs
        .map((retconDoc) => normalizeRetconDocument(retconDoc.id, projectId, retconDoc.data()))
        .sort((left, right) => left.title.localeCompare(right.title));

      callback(retcons);
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export function observeRetconById(
  uid: string,
  projectId: string,
  retconId: string,
  callback: (retcon: Retcon | null) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const retconRef = doc(db, "users", uid, "projects", projectId, "retcons", retconId);

  return onSnapshot(
    retconRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback(normalizeRetconDocument(snapshot.id, projectId, snapshot.data()));
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export async function getRetconById(uid: string, projectId: string, retconId: string) {
  const retconRef = doc(db, "users", uid, "projects", projectId, "retcons", retconId);
  const snapshot = await getDoc(retconRef);

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeRetconDocument(snapshot.id, projectId, snapshot.data());
}

export async function createRetconForProject(
  uid: string,
  projectId: string,
  values: NormalizedRetconFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Retcon title is required.");
  }

  const retconId = await getAvailableRetconId(uid, projectId, title);
  const retconRef = doc(db, "users", uid, "projects", projectId, "retcons", retconId);
  const retconDocument = buildRetconDocument({
    id: retconId,
    projectId,
    values,
  });

  await setDoc(retconRef, {
    ...retconDocument,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return retconId;
}

export async function updateRetconForProject(
  uid: string,
  projectId: string,
  retconId: string,
  values: NormalizedRetconFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Retcon title is required.");
  }

  const retconRef = doc(db, "users", uid, "projects", projectId, "retcons", retconId);

  await setDoc(
    retconRef,
    {
      projectId,
      title,
      slug: slugifyRetconTitle(title),
      summary: values.summary,
      description: values.description,
      status: values.status,
      isArchived: values.status === "archived",
      oldCanon: values.oldCanon,
      newCanon: values.newCanon,
      reason: values.reason,
      impactLevel: values.impactLevel,
      affectedEntityTypes: values.affectedEntityTypes,
      affectedEntityIds: values.affectedEntityIds,
      resolved: values.resolved,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

function normalizeRetconDocument(
  documentId: string,
  projectId: string,
  data: Record<string, unknown> | undefined
): Retcon {
  const status = coerceRetconStatus(data?.status);
  const explicitResolved = readBooleanOrNull(data?.resolved);
  const explicitIsArchived = readBooleanOrNull(data?.isArchived);

  return {
    id: documentId,
    projectId: readString(data?.projectId) ?? projectId,
    title: readString(data?.title) ?? documentId,
    slug: readString(data?.slug) ?? slugifyRetconTitle(readString(data?.title) ?? documentId),
    summary: readString(data?.summary) ?? "",
    description: readString(data?.description) ?? "",
    status,
    tags: readStringArray(data?.tags),
    isArchived: explicitIsArchived ?? status === "archived",
    canonLevel: coerceRetconCanonLevel(data?.canonLevel),
    confidence: coerceRetconConfidence(data?.confidence),
    oldCanon: readString(data?.oldCanon) ?? "",
    newCanon: readString(data?.newCanon) ?? "",
    reason: readString(data?.reason) ?? "",
    impactLevel: coerceRetconImpactLevel(data?.impactLevel),
    affectedEntityTypes: readStringArray(data?.affectedEntityTypes),
    affectedEntityIds: readStringArray(data?.affectedEntityIds),
    resolved: explicitResolved ?? status === "resolved",
    createdAt: readTimestamp(data?.createdAt),
    updatedAt: readTimestamp(data?.updatedAt),
  };
}

async function getAvailableRetconId(uid: string, projectId: string, title: string) {
  const baseId = buildRetconId(title);
  let candidateId = baseId;
  let suffix = 2;

  while (
    (await getDoc(doc(db, "users", uid, "projects", projectId, "retcons", candidateId))).exists()
  ) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}

function buildRetconId(title: string) {
  const normalized = slugifyRetconTitle(title).replace(/-/g, "_");
  return `retcon_${normalized || "retcon"}`;
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
