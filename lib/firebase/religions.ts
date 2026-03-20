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
  buildReligionDocument,
  coerceReligionCanonLevel,
  coerceReligionConfidence,
  coerceReligionStatus,
  slugifyReligionName,
  type NormalizedReligionFormValues,
  type Religion,
} from "@/types/religion";

export function getReligionDocPath(uid: string, projectId: string, religionId: string) {
  return doc(db, "users", uid, "projects", projectId, "religions", religionId).path;
}

export function observeReligionsForProject(
  uid: string,
  projectId: string,
  callback: (religions: Religion[]) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const religionsRef = collection(db, "users", uid, "projects", projectId, "religions");

  return onSnapshot(
    religionsRef,
    (snapshot) => {
      const religions = snapshot.docs
        .map((religionDoc) =>
          normalizeReligionDocument(religionDoc.id, projectId, religionDoc.data())
        )
        .sort((left, right) => left.name.localeCompare(right.name));

      callback(religions);
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export function observeReligionById(
  uid: string,
  projectId: string,
  religionId: string,
  callback: (religion: Religion | null) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const religionRef = doc(db, "users", uid, "projects", projectId, "religions", religionId);

  return onSnapshot(
    religionRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback(normalizeReligionDocument(snapshot.id, projectId, snapshot.data()));
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export async function getReligionById(
  uid: string,
  projectId: string,
  religionId: string
) {
  const religionRef = doc(db, "users", uid, "projects", projectId, "religions", religionId);
  const snapshot = await getDoc(religionRef);

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeReligionDocument(snapshot.id, projectId, snapshot.data());
}

export async function createReligionForProject(
  uid: string,
  projectId: string,
  values: NormalizedReligionFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Religion name is required.");
  }

  const religionId = await getAvailableReligionId(uid, projectId, name);
  const religionRef = doc(db, "users", uid, "projects", projectId, "religions", religionId);
  const religionDocument = buildReligionDocument({
    id: religionId,
    projectId,
    values,
  });

  await setDoc(religionRef, {
    ...religionDocument,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return religionId;
}

export async function updateReligionForProject(
  uid: string,
  projectId: string,
  religionId: string,
  values: NormalizedReligionFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Religion name is required.");
  }

  const religionRef = doc(db, "users", uid, "projects", projectId, "religions", religionId);

  await setDoc(
    religionRef,
    {
      projectId,
      name,
      slug: slugifyReligionName(name),
      summary: values.summary,
      description: values.description,
      status: values.status,
      isArchived: values.status === "archived",
      deityOrFocus: values.deityOrFocus,
      beliefSystemType: values.beliefSystemType,
      coreBeliefs: values.coreBeliefs,
      rituals: values.rituals,
      holySites: values.holySites,
      associatedCultures: values.associatedCultures,
      associatedOrganizations: values.associatedOrganizations,
      publicWikiSummary: values.publicWikiSummary,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

function normalizeReligionDocument(
  documentId: string,
  projectId: string,
  data: Record<string, unknown> | undefined
): Religion {
  const status = coerceReligionStatus(data?.status);
  const explicitIsArchived = readBooleanOrNull(data?.isArchived);

  return {
    id: documentId,
    projectId: readString(data?.projectId) ?? projectId,
    name: readString(data?.name) ?? documentId,
    slug:
      readString(data?.slug) ?? slugifyReligionName(readString(data?.name) ?? documentId),
    summary: readString(data?.summary) ?? "",
    description: readString(data?.description) ?? "",
    status,
    tags: readStringArray(data?.tags),
    isArchived: explicitIsArchived ?? status === "archived",
    canonLevel: coerceReligionCanonLevel(data?.canonLevel),
    confidence: coerceReligionConfidence(data?.confidence),
    deityOrFocus: readString(data?.deityOrFocus) ?? "",
    beliefSystemType: readString(data?.beliefSystemType) ?? "",
    coreBeliefs: readStringArray(data?.coreBeliefs),
    rituals: readStringArray(data?.rituals),
    holySites: readStringArray(data?.holySites),
    associatedCultures: readStringArray(data?.associatedCultures),
    associatedOrganizations: readStringArray(data?.associatedOrganizations),
    publicWikiSummary: readString(data?.publicWikiSummary) ?? "",
    createdAt: readTimestamp(data?.createdAt),
    updatedAt: readTimestamp(data?.updatedAt),
  };
}

async function getAvailableReligionId(uid: string, projectId: string, name: string) {
  const baseId = buildReligionId(name);
  let candidateId = baseId;
  let suffix = 2;

  while (
    (await getDoc(doc(db, "users", uid, "projects", projectId, "religions", candidateId)))
      .exists()
  ) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}

function buildReligionId(name: string) {
  const normalized = slugifyReligionName(name).replace(/-/g, "_");
  return `religion_${normalized || "religion"}`;
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
