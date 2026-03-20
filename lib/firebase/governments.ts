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
  buildGovernmentDocument,
  coerceGovernmentCanonLevel,
  coerceGovernmentConfidence,
  coerceGovernmentStatus,
  coerceGovernmentType,
  slugifyGovernmentName,
  type Government,
  type NormalizedGovernmentFormValues,
} from "@/types/government";

export function getGovernmentDocPath(uid: string, projectId: string, governmentId: string) {
  return doc(db, "users", uid, "projects", projectId, "governments", governmentId).path;
}

export function observeGovernmentsForProject(
  uid: string,
  projectId: string,
  callback: (governments: Government[]) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const governmentsRef = collection(db, "users", uid, "projects", projectId, "governments");

  return onSnapshot(
    governmentsRef,
    (snapshot) => {
      const governments = snapshot.docs
        .map((governmentDoc) =>
          normalizeGovernmentDocument(governmentDoc.id, projectId, governmentDoc.data())
        )
        .sort((left, right) => left.name.localeCompare(right.name));

      callback(governments);
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export function observeGovernmentById(
  uid: string,
  projectId: string,
  governmentId: string,
  callback: (government: Government | null) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const governmentRef = doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "governments",
    governmentId
  );

  return onSnapshot(
    governmentRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback(normalizeGovernmentDocument(snapshot.id, projectId, snapshot.data()));
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export async function getGovernmentById(
  uid: string,
  projectId: string,
  governmentId: string
) {
  const governmentRef = doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "governments",
    governmentId
  );
  const snapshot = await getDoc(governmentRef);

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeGovernmentDocument(snapshot.id, projectId, snapshot.data());
}

export async function createGovernmentForProject(
  uid: string,
  projectId: string,
  values: NormalizedGovernmentFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Government name is required.");
  }

  const governmentId = await getAvailableGovernmentId(uid, projectId, name);
  const governmentRef = doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "governments",
    governmentId
  );
  const governmentDocument = buildGovernmentDocument({
    id: governmentId,
    projectId,
    values,
  });

  await setDoc(governmentRef, {
    ...governmentDocument,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return governmentId;
}

export async function updateGovernmentForProject(
  uid: string,
  projectId: string,
  governmentId: string,
  values: NormalizedGovernmentFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Government name is required.");
  }

  const governmentRef = doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "governments",
    governmentId
  );

  await setDoc(
    governmentRef,
    {
      projectId,
      name,
      slug: slugifyGovernmentName(name),
      summary: values.summary,
      description: values.description,
      status: values.status,
      isArchived: values.status === "archived",
      governmentType: values.governmentType,
      seatLocationId: values.seatLocationId,
      leaderTitles: values.leaderTitles,
      jurisdictionNotes: values.jurisdictionNotes,
      factionIds: values.factionIds,
      organizationIds: values.organizationIds,
      lawPriorities: values.lawPriorities,
      publicWikiSummary: values.publicWikiSummary,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

function normalizeGovernmentDocument(
  documentId: string,
  projectId: string,
  data: Record<string, unknown> | undefined
): Government {
  const status = coerceGovernmentStatus(data?.status);
  const explicitIsArchived = readBooleanOrNull(data?.isArchived);

  return {
    id: documentId,
    projectId: readString(data?.projectId) ?? projectId,
    name: readString(data?.name) ?? documentId,
    slug:
      readString(data?.slug) ?? slugifyGovernmentName(readString(data?.name) ?? documentId),
    summary: readString(data?.summary) ?? "",
    description: readString(data?.description) ?? "",
    status,
    tags: readStringArray(data?.tags),
    isArchived: explicitIsArchived ?? status === "archived",
    canonLevel: coerceGovernmentCanonLevel(data?.canonLevel),
    confidence: coerceGovernmentConfidence(data?.confidence),
    governmentType: coerceGovernmentType(data?.governmentType),
    seatLocationId: readNullableString(data?.seatLocationId),
    leaderTitles: readStringArray(data?.leaderTitles),
    jurisdictionNotes: readString(data?.jurisdictionNotes) ?? "",
    factionIds: readStringArray(data?.factionIds),
    organizationIds: readStringArray(data?.organizationIds),
    lawPriorities: readStringArray(data?.lawPriorities),
    publicWikiSummary: readString(data?.publicWikiSummary) ?? "",
    createdAt: readTimestamp(data?.createdAt),
    updatedAt: readTimestamp(data?.updatedAt),
  };
}

async function getAvailableGovernmentId(uid: string, projectId: string, name: string) {
  const baseId = buildGovernmentId(name);
  let candidateId = baseId;
  let suffix = 2;

  while (
    (await getDoc(doc(db, "users", uid, "projects", projectId, "governments", candidateId)))
      .exists()
  ) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}

function buildGovernmentId(name: string) {
  const normalized = slugifyGovernmentName(name).replace(/-/g, "_");
  return `government_${normalized || "government"}`;
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
