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
  buildItemDocument,
  coerceItemCanonLevel,
  coerceItemConfidence,
  coerceItemStatus,
  slugifyItemName,
  type Item,
  type NormalizedItemFormValues,
} from "@/types/item";

export function getItemDocPath(uid: string, projectId: string, itemId: string) {
  return doc(db, "users", uid, "projects", projectId, "items", itemId).path;
}

export function observeItemsForProject(
  uid: string,
  projectId: string,
  callback: (items: Item[]) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const itemsRef = collection(db, "users", uid, "projects", projectId, "items");

  return onSnapshot(
    itemsRef,
    (snapshot) => {
      const items = snapshot.docs
        .map((itemDoc) => normalizeItemDocument(itemDoc.id, projectId, itemDoc.data()))
        .sort((left, right) => left.name.localeCompare(right.name));

      callback(items);
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export function observeItemById(
  uid: string,
  projectId: string,
  itemId: string,
  callback: (item: Item | null) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const itemRef = doc(db, "users", uid, "projects", projectId, "items", itemId);

  return onSnapshot(
    itemRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback(normalizeItemDocument(snapshot.id, projectId, snapshot.data()));
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export async function getItemById(uid: string, projectId: string, itemId: string) {
  const itemRef = doc(db, "users", uid, "projects", projectId, "items", itemId);
  const snapshot = await getDoc(itemRef);

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeItemDocument(snapshot.id, projectId, snapshot.data());
}

export async function createItemForProject(
  uid: string,
  projectId: string,
  values: NormalizedItemFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Item name is required.");
  }

  const itemId = await getAvailableItemId(uid, projectId, name);
  const itemRef = doc(db, "users", uid, "projects", projectId, "items", itemId);
  const itemDocument = buildItemDocument({
    id: itemId,
    projectId,
    values,
  });

  await setDoc(itemRef, {
    ...itemDocument,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return itemId;
}

export async function updateItemForProject(
  uid: string,
  projectId: string,
  itemId: string,
  values: NormalizedItemFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Item name is required.");
  }

  const itemRef = doc(db, "users", uid, "projects", projectId, "items", itemId);

  await setDoc(
    itemRef,
    {
      projectId,
      name,
      slug: slugifyItemName(name),
      summary: values.summary,
      description: values.description,
      status: values.status,
      isArchived: values.status === "archived",
      itemType: values.itemType,
      ownerCharacterIds: values.ownerCharacterIds,
      locationIds: values.locationIds,
      factionIds: values.factionIds,
      createdYear: values.createdYear,
      material: values.material,
      abilities: values.abilities,
      limitations: values.limitations,
      symbolicMeaning: values.symbolicMeaning,
      timelineEventIds: values.timelineEventIds,
      publicWikiSummary: values.publicWikiSummary,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

function normalizeItemDocument(
  documentId: string,
  projectId: string,
  data: Record<string, unknown> | undefined
): Item {
  const status = coerceItemStatus(data?.status);
  const explicitIsArchived = readBooleanOrNull(data?.isArchived);

  return {
    id: documentId,
    projectId: readString(data?.projectId) ?? projectId,
    name: readString(data?.name) ?? documentId,
    slug: readString(data?.slug) ?? slugifyItemName(readString(data?.name) ?? documentId),
    summary: readString(data?.summary) ?? "",
    description: readString(data?.description) ?? "",
    status,
    tags: readStringArray(data?.tags),
    isArchived: explicitIsArchived ?? status === "archived",
    canonLevel: coerceItemCanonLevel(data?.canonLevel),
    confidence: coerceItemConfidence(data?.confidence),
    itemType: readString(data?.itemType) ?? "artifact",
    ownerCharacterIds: readStringArray(data?.ownerCharacterIds),
    locationIds: readStringArray(data?.locationIds),
    factionIds: readStringArray(data?.factionIds),
    createdYear: readNumberOrNull(data?.createdYear),
    material: readString(data?.material) ?? "",
    abilities: readStringArray(data?.abilities),
    limitations: readStringArray(data?.limitations),
    symbolicMeaning: readString(data?.symbolicMeaning) ?? "",
    timelineEventIds: readStringArray(data?.timelineEventIds),
    publicWikiSummary: readString(data?.publicWikiSummary) ?? "",
    createdAt: readTimestamp(data?.createdAt),
    updatedAt: readTimestamp(data?.updatedAt),
  };
}

async function getAvailableItemId(uid: string, projectId: string, name: string) {
  const baseId = buildItemId(name);
  let candidateId = baseId;
  let suffix = 2;

  while ((await getDoc(doc(db, "users", uid, "projects", projectId, "items", candidateId))).exists()) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}

function buildItemId(name: string) {
  const normalized = slugifyItemName(name).replace(/-/g, "_");
  return `item_${normalized || "item"}`;
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
