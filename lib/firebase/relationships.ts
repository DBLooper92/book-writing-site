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
  buildRelationshipDocument,
  coerceRelationshipCanonLevel,
  coerceRelationshipConfidence,
  coerceRelationshipEntityType,
  coerceRelationshipStatus,
  coerceRelationshipType,
  slugifyRelationshipTitle,
  type NormalizedRelationshipFormValues,
  type Relationship,
} from "@/types/relationship";

export function getRelationshipDocPath(
  uid: string,
  projectId: string,
  relationshipId: string
) {
  return doc(db, "users", uid, "projects", projectId, "relationships", relationshipId).path;
}

export function observeRelationshipsForProject(
  uid: string,
  projectId: string,
  callback: (relationships: Relationship[]) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const relationshipsRef = collection(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "relationships"
  );

  return onSnapshot(
    relationshipsRef,
    (snapshot) => {
      const relationships = snapshot.docs
        .map((relationshipDoc) =>
          normalizeRelationshipDocument(relationshipDoc.id, projectId, relationshipDoc.data())
        )
        .sort((left, right) => left.title.localeCompare(right.title));

      callback(relationships);
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export function observeRelationshipById(
  uid: string,
  projectId: string,
  relationshipId: string,
  callback: (relationship: Relationship | null) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const relationshipRef = doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "relationships",
    relationshipId
  );

  return onSnapshot(
    relationshipRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback(normalizeRelationshipDocument(snapshot.id, projectId, snapshot.data()));
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export async function getRelationshipById(
  uid: string,
  projectId: string,
  relationshipId: string
) {
  const relationshipRef = doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "relationships",
    relationshipId
  );
  const snapshot = await getDoc(relationshipRef);

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeRelationshipDocument(snapshot.id, projectId, snapshot.data());
}

export async function createRelationshipForProject(
  uid: string,
  projectId: string,
  values: NormalizedRelationshipFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Relationship title is required.");
  }

  const relationshipId = await getAvailableRelationshipId(uid, projectId, title);
  const relationshipRef = doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "relationships",
    relationshipId
  );
  const relationshipDocument = buildRelationshipDocument({
    id: relationshipId,
    projectId,
    values,
  });

  await setDoc(relationshipRef, {
    ...relationshipDocument,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return relationshipId;
}

export async function updateRelationshipForProject(
  uid: string,
  projectId: string,
  relationshipId: string,
  values: NormalizedRelationshipFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Relationship title is required.");
  }

  const relationshipRef = doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "relationships",
    relationshipId
  );

  await setDoc(
    relationshipRef,
    {
      projectId,
      title,
      slug: slugifyRelationshipTitle(title),
      summary: values.summary,
      description: values.description,
      status: values.status,
      isArchived: values.status === "archived",
      relationshipType: values.relationshipType,
      entityAType: values.entityAType,
      entityAId: values.entityAId,
      entityBType: values.entityBType,
      entityBId: values.entityBId,
      dynamicStatus: values.dynamicStatus,
      history: values.history,
      tensions: values.tensions,
      strengths: values.strengths,
      publicWikiSummary: values.publicWikiSummary,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

function normalizeRelationshipDocument(
  documentId: string,
  projectId: string,
  data: Record<string, unknown> | undefined
): Relationship {
  const status = coerceRelationshipStatus(data?.status);
  const explicitIsArchived = readBooleanOrNull(data?.isArchived);

  return {
    id: documentId,
    projectId: readString(data?.projectId) ?? projectId,
    title: readString(data?.title) ?? documentId,
    slug:
      readString(data?.slug) ?? slugifyRelationshipTitle(readString(data?.title) ?? documentId),
    summary: readString(data?.summary) ?? "",
    description: readString(data?.description) ?? "",
    status,
    tags: readStringArray(data?.tags),
    isArchived: explicitIsArchived ?? status === "archived",
    canonLevel: coerceRelationshipCanonLevel(data?.canonLevel),
    confidence: coerceRelationshipConfidence(data?.confidence),
    relationshipType: coerceRelationshipType(data?.relationshipType),
    entityAType: coerceRelationshipEntityType(data?.entityAType),
    entityAId: readString(data?.entityAId) ?? "",
    entityBType: coerceRelationshipEntityType(data?.entityBType),
    entityBId: readString(data?.entityBId) ?? "",
    dynamicStatus: readString(data?.dynamicStatus) ?? "",
    history: readString(data?.history) ?? "",
    tensions: readStringArray(data?.tensions),
    strengths: readStringArray(data?.strengths),
    publicWikiSummary: readString(data?.publicWikiSummary) ?? "",
    createdAt: readTimestamp(data?.createdAt),
    updatedAt: readTimestamp(data?.updatedAt),
  };
}

async function getAvailableRelationshipId(
  uid: string,
  projectId: string,
  title: string
) {
  const baseId = buildRelationshipId(title);
  let candidateId = baseId;
  let suffix = 2;

  while (
    (
      await getDoc(
        doc(db, "users", uid, "projects", projectId, "relationships", candidateId)
      )
    ).exists()
  ) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}

function buildRelationshipId(title: string) {
  const normalized = slugifyRelationshipTitle(title).replace(/-/g, "_");
  return `relationship_${normalized || "relationship"}`;
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
