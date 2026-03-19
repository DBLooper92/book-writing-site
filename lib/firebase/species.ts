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
  buildSpeciesDocument,
  coerceSpeciesCanonLevel,
  coerceSpeciesConfidence,
  coerceSpeciesStatus,
  slugifySpeciesName,
  type NormalizedSpeciesFormValues,
  type Species,
} from "@/types/species";

export function getSpeciesDocPath(uid: string, projectId: string, speciesId: string) {
  return doc(db, "users", uid, "projects", projectId, "species", speciesId).path;
}

export function observeSpeciesForProject(
  uid: string,
  projectId: string,
  callback: (speciesEntries: Species[]) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const speciesRef = collection(db, "users", uid, "projects", projectId, "species");

  return onSnapshot(
    speciesRef,
    (snapshot) => {
      const speciesEntries = snapshot.docs
        .map((speciesDoc) =>
          normalizeSpeciesDocument(speciesDoc.id, projectId, speciesDoc.data())
        )
        .sort((left, right) => left.name.localeCompare(right.name));

      callback(speciesEntries);
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export function observeSpeciesById(
  uid: string,
  projectId: string,
  speciesId: string,
  callback: (species: Species | null) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const speciesRef = doc(db, "users", uid, "projects", projectId, "species", speciesId);

  return onSnapshot(
    speciesRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback(normalizeSpeciesDocument(snapshot.id, projectId, snapshot.data()));
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export async function getSpeciesById(uid: string, projectId: string, speciesId: string) {
  const speciesRef = doc(db, "users", uid, "projects", projectId, "species", speciesId);
  const snapshot = await getDoc(speciesRef);

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeSpeciesDocument(snapshot.id, projectId, snapshot.data());
}

export async function createSpeciesForProject(
  uid: string,
  projectId: string,
  values: NormalizedSpeciesFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Species name is required.");
  }

  const speciesId = await getAvailableSpeciesId(uid, projectId, name);
  const speciesRef = doc(db, "users", uid, "projects", projectId, "species", speciesId);
  const speciesDocument = buildSpeciesDocument({
    id: speciesId,
    projectId,
    values,
  });

  await setDoc(speciesRef, {
    ...speciesDocument,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return speciesId;
}

export async function updateSpeciesForProject(
  uid: string,
  projectId: string,
  speciesId: string,
  values: NormalizedSpeciesFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Species name is required.");
  }

  const speciesRef = doc(db, "users", uid, "projects", projectId, "species", speciesId);

  await setDoc(
    speciesRef,
    {
      projectId,
      name,
      slug: slugifySpeciesName(name),
      summary: values.summary,
      description: values.description,
      status: values.status,
      isArchived: values.status === "archived",
      origin: values.origin,
      lifespan: values.lifespan,
      appearance: values.appearance,
      biology: values.biology,
      reproduction: values.reproduction,
      diet: values.diet,
      psychology: values.psychology,
      socialStructure: values.socialStructure,
      abilities: values.abilities,
      limitations: values.limitations,
      notableSubgroups: values.notableSubgroups,
      publicWikiSummary: values.publicWikiSummary,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

function normalizeSpeciesDocument(
  documentId: string,
  projectId: string,
  data: Record<string, unknown> | undefined
): Species {
  const status = coerceSpeciesStatus(data?.status);
  const explicitIsArchived = readBooleanOrNull(data?.isArchived);

  return {
    id: documentId,
    projectId: readString(data?.projectId) ?? projectId,
    name: readString(data?.name) ?? documentId,
    slug: readString(data?.slug) ?? slugifySpeciesName(readString(data?.name) ?? documentId),
    summary: readString(data?.summary) ?? "",
    description: readString(data?.description) ?? "",
    status,
    tags: readStringArray(data?.tags),
    isArchived: explicitIsArchived ?? status === "archived",
    canonLevel: coerceSpeciesCanonLevel(data?.canonLevel),
    confidence: coerceSpeciesConfidence(data?.confidence),
    origin: readString(data?.origin) ?? "",
    lifespan: readString(data?.lifespan) ?? "",
    appearance: readString(data?.appearance) ?? "",
    biology: readString(data?.biology) ?? "",
    reproduction: readString(data?.reproduction) ?? "",
    diet: readString(data?.diet) ?? "",
    psychology: readString(data?.psychology) ?? "",
    socialStructure: readString(data?.socialStructure) ?? "",
    abilities: readStringArray(data?.abilities),
    limitations: readStringArray(data?.limitations),
    notableSubgroups: readStringArray(data?.notableSubgroups),
    publicWikiSummary: readString(data?.publicWikiSummary) ?? "",
    createdAt: readTimestamp(data?.createdAt),
    updatedAt: readTimestamp(data?.updatedAt),
  };
}

async function getAvailableSpeciesId(uid: string, projectId: string, name: string) {
  const baseId = buildSpeciesId(name);
  let candidateId = baseId;
  let suffix = 2;

  while (
    (await getDoc(doc(db, "users", uid, "projects", projectId, "species", candidateId))).exists()
  ) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}

function buildSpeciesId(name: string) {
  const normalized = slugifySpeciesName(name).replace(/-/g, "_");
  return `species_${normalized || "species"}`;
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
