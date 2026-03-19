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
  buildEraDocument,
  coerceEraCanonLevel,
  coerceEraConfidence,
  coerceEraStatus,
  slugifyEraName,
  type Era,
  type NormalizedEraFormValues,
} from "@/types/era";

export function getEraDocPath(uid: string, projectId: string, eraId: string) {
  return doc(db, "users", uid, "projects", projectId, "eras", eraId).path;
}

export function observeErasForProject(
  uid: string,
  projectId: string,
  callback: (eras: Era[]) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const erasRef = collection(db, "users", uid, "projects", projectId, "eras");

  return onSnapshot(
    erasRef,
    (snapshot) => {
      const eras = snapshot.docs
        .map((eraDoc) => normalizeEraDocument(eraDoc.id, projectId, eraDoc.data()))
        .sort(compareEras);

      callback(eras);
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export function observeEraById(
  uid: string,
  projectId: string,
  eraId: string,
  callback: (era: Era | null) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const eraRef = doc(db, "users", uid, "projects", projectId, "eras", eraId);

  return onSnapshot(
    eraRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback(normalizeEraDocument(snapshot.id, projectId, snapshot.data()));
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export async function getEraById(uid: string, projectId: string, eraId: string) {
  const eraRef = doc(db, "users", uid, "projects", projectId, "eras", eraId);
  const snapshot = await getDoc(eraRef);

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeEraDocument(snapshot.id, projectId, snapshot.data());
}

export async function createEraForProject(
  uid: string,
  projectId: string,
  values: NormalizedEraFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Era name is required.");
  }

  const eraId = await getAvailableEraId(uid, projectId, name);
  const eraRef = doc(db, "users", uid, "projects", projectId, "eras", eraId);
  const eraDocument = buildEraDocument({
    id: eraId,
    projectId,
    values,
  });

  await setDoc(eraRef, {
    ...eraDocument,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return eraId;
}

export async function updateEraForProject(
  uid: string,
  projectId: string,
  eraId: string,
  values: NormalizedEraFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Era name is required.");
  }

  const eraRef = doc(db, "users", uid, "projects", projectId, "eras", eraId);

  await setDoc(
    eraRef,
    {
      projectId,
      name,
      slug: slugifyEraName(name),
      summary: values.summary,
      description: values.description,
      status: values.status,
      isArchived: values.status === "archived",
      startYear: values.startYear,
      endYear: values.endYear,
      definingEvents: values.definingEvents,
      keyLocations: values.keyLocations,
      keyFactions: values.keyFactions,
      dominantThemes: values.dominantThemes,
      publicWikiSummary: values.publicWikiSummary,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

function normalizeEraDocument(
  documentId: string,
  projectId: string,
  data: Record<string, unknown> | undefined
): Era {
  const status = coerceEraStatus(data?.status);
  const explicitIsArchived = readBooleanOrNull(data?.isArchived);

  return {
    id: documentId,
    projectId: readString(data?.projectId) ?? projectId,
    name: readString(data?.name) ?? documentId,
    slug: readString(data?.slug) ?? slugifyEraName(readString(data?.name) ?? documentId),
    summary: readString(data?.summary) ?? "",
    description: readString(data?.description) ?? "",
    status,
    tags: readStringArray(data?.tags),
    isArchived: explicitIsArchived ?? status === "archived",
    canonLevel: coerceEraCanonLevel(data?.canonLevel),
    confidence: coerceEraConfidence(data?.confidence),
    startYear: readNumberOrNull(data?.startYear),
    endYear: readNumberOrNull(data?.endYear),
    definingEvents: readStringArray(data?.definingEvents),
    keyLocations: readStringArray(data?.keyLocations ?? data?.keyLocationIds),
    keyFactions: readStringArray(data?.keyFactions ?? data?.keyFactionIds),
    dominantThemes: readStringArray(data?.dominantThemes ?? data?.dominantThemeIds),
    publicWikiSummary: readString(data?.publicWikiSummary) ?? "",
    createdAt: readTimestamp(data?.createdAt),
    updatedAt: readTimestamp(data?.updatedAt),
  };
}

async function getAvailableEraId(uid: string, projectId: string, name: string) {
  const baseId = buildEraId(name);
  let candidateId = baseId;
  let suffix = 2;

  while ((await getDoc(doc(db, "users", uid, "projects", projectId, "eras", candidateId))).exists()) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}

function buildEraId(name: string) {
  const normalized = slugifyEraName(name).replace(/-/g, "_");
  return `era_${normalized || "era"}`;
}

function compareEras(left: Era, right: Era) {
  const leftStartYear = left.startYear;
  const rightStartYear = right.startYear;

  if (typeof leftStartYear === "number" && typeof rightStartYear === "number") {
    if (leftStartYear !== rightStartYear) {
      return leftStartYear - rightStartYear;
    }
  } else if (typeof leftStartYear === "number") {
    return -1;
  } else if (typeof rightStartYear === "number") {
    return 1;
  }

  const leftEndYear = left.endYear;
  const rightEndYear = right.endYear;

  if (typeof leftEndYear === "number" && typeof rightEndYear === "number") {
    if (leftEndYear !== rightEndYear) {
      return leftEndYear - rightEndYear;
    }
  } else if (typeof leftEndYear === "number") {
    return -1;
  } else if (typeof rightEndYear === "number") {
    return 1;
  }

  return left.name.localeCompare(right.name);
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

function readNumberOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function readBooleanOrNull(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function readTimestamp(value: unknown) {
  return value instanceof Timestamp ? value : null;
}
