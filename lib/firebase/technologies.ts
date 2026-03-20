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
  buildTechnologyDocument,
  coerceTechnologyCanonLevel,
  coerceTechnologyConfidence,
  coerceTechnologyStatus,
  slugifyTechnologyName,
  type NormalizedTechnologyFormValues,
  type Technology,
} from "@/types/technology";

export function getTechnologyDocPath(
  uid: string,
  projectId: string,
  technologyId: string
) {
  return doc(db, "users", uid, "projects", projectId, "technologies", technologyId).path;
}

export function observeTechnologiesForProject(
  uid: string,
  projectId: string,
  callback: (technologies: Technology[]) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const technologiesRef = collection(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "technologies"
  );

  return onSnapshot(
    technologiesRef,
    (snapshot) => {
      const technologies = snapshot.docs
        .map((technologyDoc) =>
          normalizeTechnologyDocument(technologyDoc.id, projectId, technologyDoc.data())
        )
        .sort((left, right) => left.name.localeCompare(right.name));

      callback(technologies);
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export function observeTechnologyById(
  uid: string,
  projectId: string,
  technologyId: string,
  callback: (technology: Technology | null) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const technologyRef = doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "technologies",
    technologyId
  );

  return onSnapshot(
    technologyRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback(normalizeTechnologyDocument(snapshot.id, projectId, snapshot.data()));
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export async function getTechnologyById(
  uid: string,
  projectId: string,
  technologyId: string
) {
  const technologyRef = doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "technologies",
    technologyId
  );
  const snapshot = await getDoc(technologyRef);

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeTechnologyDocument(snapshot.id, projectId, snapshot.data());
}

export async function createTechnologyForProject(
  uid: string,
  projectId: string,
  values: NormalizedTechnologyFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Technology name is required.");
  }

  const technologyId = await getAvailableTechnologyId(uid, projectId, name);
  const technologyRef = doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "technologies",
    technologyId
  );
  const technologyDocument = buildTechnologyDocument({
    id: technologyId,
    projectId,
    values,
  });

  await setDoc(technologyRef, {
    ...technologyDocument,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return technologyId;
}

export async function updateTechnologyForProject(
  uid: string,
  projectId: string,
  technologyId: string,
  values: NormalizedTechnologyFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Technology name is required.");
  }

  const technologyRef = doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "technologies",
    technologyId
  );

  await setDoc(
    technologyRef,
    {
      projectId,
      name,
      slug: slugifyTechnologyName(name),
      summary: values.summary,
      description: values.description,
      status: values.status,
      isArchived: values.status === "archived",
      technologyType: values.technologyType,
      inventedYear: values.inventedYear,
      inventorNotes: values.inventorNotes,
      powerSource: values.powerSource,
      limitations: values.limitations,
      associatedLocationIds: values.associatedLocationIds,
      associatedFactionIds: values.associatedFactionIds,
      timelineEventIds: values.timelineEventIds,
      publicWikiSummary: values.publicWikiSummary,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

function normalizeTechnologyDocument(
  documentId: string,
  projectId: string,
  data: Record<string, unknown> | undefined
): Technology {
  const status = coerceTechnologyStatus(data?.status);
  const explicitIsArchived = readBooleanOrNull(data?.isArchived);

  return {
    id: documentId,
    projectId: readString(data?.projectId) ?? projectId,
    name: readString(data?.name) ?? documentId,
    slug:
      readString(data?.slug) ?? slugifyTechnologyName(readString(data?.name) ?? documentId),
    summary: readString(data?.summary) ?? "",
    description: readString(data?.description) ?? "",
    status,
    tags: readStringArray(data?.tags),
    isArchived: explicitIsArchived ?? status === "archived",
    canonLevel: coerceTechnologyCanonLevel(data?.canonLevel),
    confidence: coerceTechnologyConfidence(data?.confidence),
    technologyType: readString(data?.technologyType) ?? "technology",
    inventedYear: readNumberOrNull(data?.inventedYear),
    inventorNotes: readString(data?.inventorNotes) ?? "",
    powerSource: readString(data?.powerSource) ?? "",
    limitations: readStringArray(data?.limitations),
    associatedLocationIds: readStringArray(data?.associatedLocationIds),
    associatedFactionIds: readStringArray(data?.associatedFactionIds),
    timelineEventIds: readStringArray(data?.timelineEventIds),
    publicWikiSummary: readString(data?.publicWikiSummary) ?? "",
    createdAt: readTimestamp(data?.createdAt),
    updatedAt: readTimestamp(data?.updatedAt),
  };
}

async function getAvailableTechnologyId(
  uid: string,
  projectId: string,
  name: string
) {
  const baseId = buildTechnologyId(name);
  let candidateId = baseId;
  let suffix = 2;

  while (
    (
      await getDoc(
        doc(db, "users", uid, "projects", projectId, "technologies", candidateId)
      )
    ).exists()
  ) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}

function buildTechnologyId(name: string) {
  const normalized = slugifyTechnologyName(name).replace(/-/g, "_");
  return `technology_${normalized || "technology"}`;
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

function readNumberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readTimestamp(value: unknown) {
  return value instanceof Timestamp ? value : null;
}
