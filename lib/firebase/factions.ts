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
  buildFactionDocument,
  coerceFactionCanonLevel,
  coerceFactionConfidence,
  coerceFactionStatus,
  coerceFactionType,
  slugifyFactionName,
  type Faction,
  type NormalizedFactionFormValues,
} from "@/types/faction";

export function getFactionDocPath(uid: string, projectId: string, factionId: string) {
  return doc(db, "users", uid, "projects", projectId, "factions", factionId).path;
}

export function observeFactionsForProject(
  uid: string,
  projectId: string,
  callback: (factions: Faction[]) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const factionsRef = collection(db, "users", uid, "projects", projectId, "factions");

  return onSnapshot(
    factionsRef,
    (snapshot) => {
      const factions = snapshot.docs
        .map((factionDoc) =>
          normalizeFactionDocument(factionDoc.id, projectId, factionDoc.data())
        )
        .sort((left, right) => left.name.localeCompare(right.name));

      callback(factions);
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export function observeFactionById(
  uid: string,
  projectId: string,
  factionId: string,
  callback: (faction: Faction | null) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const factionRef = doc(db, "users", uid, "projects", projectId, "factions", factionId);

  return onSnapshot(
    factionRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback(normalizeFactionDocument(snapshot.id, projectId, snapshot.data()));
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export async function getFactionById(uid: string, projectId: string, factionId: string) {
  const factionRef = doc(db, "users", uid, "projects", projectId, "factions", factionId);
  const snapshot = await getDoc(factionRef);

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeFactionDocument(snapshot.id, projectId, snapshot.data());
}

export async function createFactionForProject(
  uid: string,
  projectId: string,
  values: NormalizedFactionFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Faction name is required.");
  }

  const factionId = await getAvailableFactionId(uid, projectId, name);
  const factionRef = doc(db, "users", uid, "projects", projectId, "factions", factionId);
  const factionDocument = buildFactionDocument({
    id: factionId,
    projectId,
    values,
  });

  await setDoc(factionRef, {
    ...factionDocument,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return factionId;
}

export async function updateFactionForProject(
  uid: string,
  projectId: string,
  factionId: string,
  values: NormalizedFactionFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Faction name is required.");
  }

  const factionRef = doc(db, "users", uid, "projects", projectId, "factions", factionId);

  await setDoc(
    factionRef,
    {
      projectId,
      name,
      slug: slugifyFactionName(name),
      summary: values.summary,
      description: values.description,
      status: values.status,
      isArchived: values.status === "archived",
      factionType: values.factionType,
      foundedYear: values.foundedYear,
      endedYear: values.endedYear,
      leaderCharacterIds: values.leaderCharacterIds,
      baseLocationIds: values.baseLocationIds,
      governmentId: values.governmentId,
      goals: values.goals,
      resources: values.resources,
      publicWikiSummary: values.publicWikiSummary,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

function normalizeFactionDocument(
  documentId: string,
  projectId: string,
  data: Record<string, unknown> | undefined
): Faction {
  const status = coerceFactionStatus(data?.status);
  const explicitIsArchived = readBooleanOrNull(data?.isArchived);

  return {
    id: documentId,
    projectId: readString(data?.projectId) ?? projectId,
    name: readString(data?.name) ?? documentId,
    slug: readString(data?.slug) ?? slugifyFactionName(readString(data?.name) ?? documentId),
    summary: readString(data?.summary) ?? "",
    description: readString(data?.description) ?? "",
    status,
    tags: readStringArray(data?.tags),
    isArchived: explicitIsArchived ?? status === "archived",
    canonLevel: coerceFactionCanonLevel(data?.canonLevel),
    confidence: coerceFactionConfidence(data?.confidence),
    factionType: coerceFactionType(data?.factionType),
    foundedYear: readNumberOrNull(data?.foundedYear),
    endedYear: readNumberOrNull(data?.endedYear),
    leaderCharacterIds: readStringArray(data?.leaderCharacterIds),
    baseLocationIds: readStringArray(data?.baseLocationIds),
    cultureIds: readStringArray(data?.cultureIds),
    religionIds: readStringArray(data?.religionIds),
    governmentId: readNullableString(data?.governmentId),
    goals: readStringArray(data?.goals),
    resources: readStringArray(data?.resources),
    rivals: readStringArray(data?.rivals),
    allies: readStringArray(data?.allies),
    timelineEventIds: readStringArray(data?.timelineEventIds),
    bookIds: readStringArray(data?.bookIds),
    publicWikiSummary: readString(data?.publicWikiSummary) ?? "",
    createdAt: readTimestamp(data?.createdAt),
    updatedAt: readTimestamp(data?.updatedAt),
  };
}

async function getAvailableFactionId(uid: string, projectId: string, name: string) {
  const baseId = buildFactionId(name);
  let candidateId = baseId;
  let suffix = 2;

  while (
    (await getDoc(doc(db, "users", uid, "projects", projectId, "factions", candidateId))).exists()
  ) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}

function buildFactionId(name: string) {
  const normalized = slugifyFactionName(name).replace(/-/g, "_");
  return `faction_${normalized || "faction"}`;
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

function readNumberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readBooleanOrNull(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function readTimestamp(value: unknown) {
  return value instanceof Timestamp ? value : null;
}
