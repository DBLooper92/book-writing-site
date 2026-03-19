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
  buildCultureDocument,
  coerceCultureCanonLevel,
  coerceCultureConfidence,
  coerceCultureStatus,
  slugifyCultureName,
  type Culture,
  type NormalizedCultureFormValues,
} from "@/types/culture";

export function getCultureDocPath(uid: string, projectId: string, cultureId: string) {
  return doc(db, "users", uid, "projects", projectId, "cultures", cultureId).path;
}

export function observeCulturesForProject(
  uid: string,
  projectId: string,
  callback: (cultures: Culture[]) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const culturesRef = collection(db, "users", uid, "projects", projectId, "cultures");

  return onSnapshot(
    culturesRef,
    (snapshot) => {
      const cultures = snapshot.docs
        .map((cultureDoc) =>
          normalizeCultureDocument(cultureDoc.id, projectId, cultureDoc.data())
        )
        .sort((left, right) => left.name.localeCompare(right.name));

      callback(cultures);
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export function observeCultureById(
  uid: string,
  projectId: string,
  cultureId: string,
  callback: (culture: Culture | null) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const cultureRef = doc(db, "users", uid, "projects", projectId, "cultures", cultureId);

  return onSnapshot(
    cultureRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback(normalizeCultureDocument(snapshot.id, projectId, snapshot.data()));
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export async function getCultureById(uid: string, projectId: string, cultureId: string) {
  const cultureRef = doc(db, "users", uid, "projects", projectId, "cultures", cultureId);
  const snapshot = await getDoc(cultureRef);

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeCultureDocument(snapshot.id, projectId, snapshot.data());
}

export async function createCultureForProject(
  uid: string,
  projectId: string,
  values: NormalizedCultureFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Culture name is required.");
  }

  const cultureId = await getAvailableCultureId(uid, projectId, name);
  const cultureRef = doc(db, "users", uid, "projects", projectId, "cultures", cultureId);
  const cultureDocument = buildCultureDocument({
    id: cultureId,
    projectId,
    values,
  });

  await setDoc(cultureRef, {
    ...cultureDocument,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return cultureId;
}

export async function updateCultureForProject(
  uid: string,
  projectId: string,
  cultureId: string,
  values: NormalizedCultureFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Culture name is required.");
  }

  const cultureRef = doc(db, "users", uid, "projects", projectId, "cultures", cultureId);

  await setDoc(
    cultureRef,
    {
      projectId,
      name,
      slug: slugifyCultureName(name),
      summary: values.summary,
      description: values.description,
      status: values.status,
      isArchived: values.status === "archived",
      coreValues: values.coreValues,
      traditions: values.traditions,
      associatedLocationIds: values.associatedLocationIds,
      languageIds: values.languageIds,
      publicWikiSummary: values.publicWikiSummary,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

function normalizeCultureDocument(
  documentId: string,
  projectId: string,
  data: Record<string, unknown> | undefined
): Culture {
  const status = coerceCultureStatus(data?.status);
  const explicitIsArchived = readBooleanOrNull(data?.isArchived);

  return {
    id: documentId,
    projectId: readString(data?.projectId) ?? projectId,
    name: readString(data?.name) ?? documentId,
    slug: readString(data?.slug) ?? slugifyCultureName(readString(data?.name) ?? documentId),
    summary: readString(data?.summary) ?? "",
    description: readString(data?.description) ?? "",
    status,
    tags: readStringArray(data?.tags),
    isArchived: explicitIsArchived ?? status === "archived",
    canonLevel: coerceCultureCanonLevel(data?.canonLevel),
    confidence: coerceCultureConfidence(data?.confidence),
    coreValues: readStringArray(data?.coreValues),
    traditions: readStringArray(data?.traditions),
    associatedLocationIds: readStringArray(data?.associatedLocationIds),
    languageIds: readStringArray(data?.languageIds),
    religionIds: readStringArray(data?.religionIds),
    factionIds: readStringArray(data?.factionIds),
    eraIds: readStringArray(data?.eraIds),
    publicWikiSummary: readString(data?.publicWikiSummary) ?? "",
    createdAt: readTimestamp(data?.createdAt),
    updatedAt: readTimestamp(data?.updatedAt),
  };
}

async function getAvailableCultureId(uid: string, projectId: string, name: string) {
  const baseId = buildCultureId(name);
  let candidateId = baseId;
  let suffix = 2;

  while (
    (await getDoc(doc(db, "users", uid, "projects", projectId, "cultures", candidateId))).exists()
  ) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}

function buildCultureId(name: string) {
  const normalized = slugifyCultureName(name).replace(/-/g, "_");
  return `culture_${normalized || "culture"}`;
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
