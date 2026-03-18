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
  buildChapterDocument,
  coerceChapterCanonLevel,
  coerceChapterConfidence,
  coerceChapterStatus,
  slugifyChapterTitle,
  type Chapter,
  type NormalizedChapterFormValues,
} from "@/types/chapter";

export function getChapterDocPath(
  uid: string,
  projectId: string,
  chapterId: string
) {
  return doc(db, "users", uid, "projects", projectId, "chapters", chapterId).path;
}

export function observeChaptersForProject(
  uid: string,
  projectId: string,
  callback: (chapters: Chapter[]) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const chaptersRef = collection(db, "users", uid, "projects", projectId, "chapters");

  return onSnapshot(
    chaptersRef,
    (snapshot) => {
      const chapters = snapshot.docs
        .map((chapterDoc) =>
          normalizeChapterDocument(chapterDoc.id, projectId, chapterDoc.data())
        )
        .sort(compareChapters);

      callback(chapters);
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export function observeChapterById(
  uid: string,
  projectId: string,
  chapterId: string,
  callback: (chapter: Chapter | null) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const chapterRef = doc(db, "users", uid, "projects", projectId, "chapters", chapterId);

  return onSnapshot(
    chapterRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback(normalizeChapterDocument(snapshot.id, projectId, snapshot.data()));
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export async function getChapterById(
  uid: string,
  projectId: string,
  chapterId: string
) {
  const chapterRef = doc(db, "users", uid, "projects", projectId, "chapters", chapterId);
  const snapshot = await getDoc(chapterRef);

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeChapterDocument(snapshot.id, projectId, snapshot.data());
}

export async function createChapterForProject(
  uid: string,
  projectId: string,
  values: NormalizedChapterFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Chapter title is required.");
  }

  const chapterId = await getAvailableChapterId(uid, projectId, title);
  const chapterRef = doc(db, "users", uid, "projects", projectId, "chapters", chapterId);
  const chapterDocument = buildChapterDocument({
    id: chapterId,
    projectId,
    values,
  });

  await setDoc(chapterRef, {
    ...chapterDocument,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return chapterId;
}

export async function updateChapterForProject(
  uid: string,
  projectId: string,
  chapterId: string,
  values: NormalizedChapterFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Chapter title is required.");
  }

  const chapterRef = doc(db, "users", uid, "projects", projectId, "chapters", chapterId);

  await setDoc(
    chapterRef,
    {
      projectId,
      title,
      slug: slugifyChapterTitle(title),
      summary: values.summary,
      description: values.description,
      status: values.status,
      isArchived: values.status === "archived",
      bookId: values.bookId,
      chapterNumber: values.chapterNumber,
      purpose: values.purpose,
      pointOfViewCharacterId: values.pointOfViewCharacterId,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

function normalizeChapterDocument(
  documentId: string,
  projectId: string,
  data: Record<string, unknown> | undefined
): Chapter {
  const status = coerceChapterStatus(data?.status);
  const explicitIsArchived = readBooleanOrNull(data?.isArchived);

  return {
    id: documentId,
    projectId: readString(data?.projectId) ?? projectId,
    title: readString(data?.title) ?? documentId,
    slug: readString(data?.slug) ?? slugifyChapterTitle(readString(data?.title) ?? documentId),
    summary: readString(data?.summary) ?? "",
    description: readString(data?.description) ?? "",
    status,
    tags: readStringArray(data?.tags),
    isArchived: explicitIsArchived ?? status === "archived",
    canonLevel: coerceChapterCanonLevel(data?.canonLevel),
    confidence: coerceChapterConfidence(data?.confidence),
    bookId: readNullableString(data?.bookId),
    chapterNumber: readNumberOrNull(data?.chapterNumber),
    purpose: readString(data?.purpose) ?? "",
    pointOfViewCharacterId: readNullableString(data?.pointOfViewCharacterId),
    timelineEventIds: readStringArray(data?.timelineEventIds),
    sceneIds: readStringArray(data?.sceneIds),
    locationIds: readStringArray(data?.locationIds),
    characterIds: readStringArray(data?.characterIds),
    plotThreadIds: readStringArray(data?.plotThreadIds),
    foreshadows: readStringArray(data?.foreshadows),
    payoffs: readStringArray(data?.payoffs),
    createdAt: readTimestamp(data?.createdAt),
    updatedAt: readTimestamp(data?.updatedAt),
  };
}

async function getAvailableChapterId(uid: string, projectId: string, title: string) {
  const baseId = buildChapterId(title);
  let candidateId = baseId;
  let suffix = 2;

  while (
    (await getDoc(doc(db, "users", uid, "projects", projectId, "chapters", candidateId))).exists()
  ) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}

function buildChapterId(title: string) {
  const normalized = slugifyChapterTitle(title).replace(/-/g, "_");
  return `chapter_${normalized || "chapter"}`;
}

function compareChapters(left: Chapter, right: Chapter) {
  const leftBookKey = left.bookId ?? "~";
  const rightBookKey = right.bookId ?? "~";

  if (leftBookKey !== rightBookKey) {
    return leftBookKey.localeCompare(rightBookKey);
  }

  if (typeof left.chapterNumber === "number" && typeof right.chapterNumber === "number") {
    if (left.chapterNumber !== right.chapterNumber) {
      return left.chapterNumber - right.chapterNumber;
    }
  } else if (typeof left.chapterNumber === "number") {
    return -1;
  } else if (typeof right.chapterNumber === "number") {
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
