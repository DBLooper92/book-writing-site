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
  buildSceneDocument,
  coerceSceneCanonLevel,
  coerceSceneConfidence,
  coerceSceneStatus,
  coerceSceneType,
  slugifySceneTitle,
  type NormalizedSceneFormValues,
  type Scene,
} from "@/types/scene";

export function getSceneDocPath(uid: string, projectId: string, sceneId: string) {
  return doc(db, "users", uid, "projects", projectId, "scenes", sceneId).path;
}

export function observeScenesForProject(
  uid: string,
  projectId: string,
  callback: (scenes: Scene[]) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const scenesRef = collection(db, "users", uid, "projects", projectId, "scenes");

  return onSnapshot(
    scenesRef,
    (snapshot) => {
      const scenes = snapshot.docs
        .map((sceneDoc) => normalizeSceneDocument(sceneDoc.id, projectId, sceneDoc.data()))
        .sort(compareScenes);

      callback(scenes);
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export function observeSceneById(
  uid: string,
  projectId: string,
  sceneId: string,
  callback: (scene: Scene | null) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const sceneRef = doc(db, "users", uid, "projects", projectId, "scenes", sceneId);

  return onSnapshot(
    sceneRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback(normalizeSceneDocument(snapshot.id, projectId, snapshot.data()));
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export async function getSceneById(uid: string, projectId: string, sceneId: string) {
  const sceneRef = doc(db, "users", uid, "projects", projectId, "scenes", sceneId);
  const snapshot = await getDoc(sceneRef);

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeSceneDocument(snapshot.id, projectId, snapshot.data());
}

export async function createSceneForProject(
  uid: string,
  projectId: string,
  values: NormalizedSceneFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Scene title is required.");
  }

  const sceneId = await getAvailableSceneId(uid, projectId, title);
  const sceneRef = doc(db, "users", uid, "projects", projectId, "scenes", sceneId);
  const sceneDocument = buildSceneDocument({
    id: sceneId,
    projectId,
    values,
  });

  await setDoc(sceneRef, {
    ...sceneDocument,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return sceneId;
}

export async function updateSceneForProject(
  uid: string,
  projectId: string,
  sceneId: string,
  values: NormalizedSceneFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Scene title is required.");
  }

  const sceneRef = doc(db, "users", uid, "projects", projectId, "scenes", sceneId);

  await setDoc(
    sceneRef,
    {
      projectId,
      title,
      slug: slugifySceneTitle(title),
      summary: values.summary,
      description: values.description,
      status: values.status,
      isArchived: values.status === "archived",
      bookId: values.bookId,
      chapterId: values.chapterId,
      sceneNumber: values.sceneNumber,
      sceneType: values.sceneType,
      pointOfViewCharacterId: values.pointOfViewCharacterId,
      goal: values.goal,
      conflict: values.conflict,
      outcome: values.outcome,
      textDraft: values.textDraft,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

function normalizeSceneDocument(
  documentId: string,
  projectId: string,
  data: Record<string, unknown> | undefined
): Scene {
  const status = coerceSceneStatus(data?.status);
  const explicitIsArchived = readBooleanOrNull(data?.isArchived);

  return {
    id: documentId,
    projectId: readString(data?.projectId) ?? projectId,
    title: readString(data?.title) ?? documentId,
    slug: readString(data?.slug) ?? slugifySceneTitle(readString(data?.title) ?? documentId),
    summary: readString(data?.summary) ?? "",
    description: readString(data?.description) ?? "",
    status,
    tags: readStringArray(data?.tags),
    isArchived: explicitIsArchived ?? status === "archived",
    canonLevel: coerceSceneCanonLevel(data?.canonLevel),
    confidence: coerceSceneConfidence(data?.confidence),
    bookId: readNullableString(data?.bookId),
    chapterId: readNullableString(data?.chapterId),
    sceneNumber: readNumberOrNull(data?.sceneNumber),
    sceneType: coerceSceneType(data?.sceneType),
    pointOfViewCharacterId: readNullableString(data?.pointOfViewCharacterId),
    goal: readString(data?.goal) ?? "",
    conflict: readString(data?.conflict) ?? "",
    outcome: readString(data?.outcome) ?? "",
    textDraft: readString(data?.textDraft) ?? "",
    timelineEventIds: readStringArray(data?.timelineEventIds),
    characterIds: readStringArray(data?.characterIds),
    locationIds: readStringArray(data?.locationIds),
    plotThreadIds: readStringArray(data?.plotThreadIds),
    createdAt: readTimestamp(data?.createdAt),
    updatedAt: readTimestamp(data?.updatedAt),
  };
}

async function getAvailableSceneId(uid: string, projectId: string, title: string) {
  const baseId = buildSceneId(title);
  let candidateId = baseId;
  let suffix = 2;

  while (
    (await getDoc(doc(db, "users", uid, "projects", projectId, "scenes", candidateId))).exists()
  ) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}

function buildSceneId(title: string) {
  const normalized = slugifySceneTitle(title).replace(/-/g, "_");
  return `scene_${normalized || "scene"}`;
}

function compareScenes(left: Scene, right: Scene) {
  const leftBookKey = left.bookId ?? "~";
  const rightBookKey = right.bookId ?? "~";

  if (leftBookKey !== rightBookKey) {
    return leftBookKey.localeCompare(rightBookKey);
  }

  const leftChapterKey = left.chapterId ?? "~";
  const rightChapterKey = right.chapterId ?? "~";

  if (leftChapterKey !== rightChapterKey) {
    return leftChapterKey.localeCompare(rightChapterKey);
  }

  if (typeof left.sceneNumber === "number" && typeof right.sceneNumber === "number") {
    if (left.sceneNumber !== right.sceneNumber) {
      return left.sceneNumber - right.sceneNumber;
    }
  } else if (typeof left.sceneNumber === "number") {
    return -1;
  } else if (typeof right.sceneNumber === "number") {
    return 1;
  }

  return left.title.localeCompare(right.title);
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
