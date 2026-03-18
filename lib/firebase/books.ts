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
  buildBookDocument,
  coerceBookCanonLevel,
  coerceBookConfidence,
  coerceBookDraftStage,
  coerceBookStatus,
  slugifyBookTitle,
  type Book,
  type NormalizedBookFormValues,
} from "@/types/book";

export function getBookDocPath(uid: string, projectId: string, bookId: string) {
  return doc(db, "users", uid, "projects", projectId, "books", bookId).path;
}

export function observeBooksForProject(
  uid: string,
  projectId: string,
  callback: (books: Book[]) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const booksRef = collection(db, "users", uid, "projects", projectId, "books");

  return onSnapshot(
    booksRef,
    (snapshot) => {
      const books = snapshot.docs
        .map((bookDoc) => normalizeBookDocument(bookDoc.id, projectId, bookDoc.data()))
        .sort(compareBooks);

      callback(books);
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export function observeBookById(
  uid: string,
  projectId: string,
  bookId: string,
  callback: (book: Book | null) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const bookRef = doc(db, "users", uid, "projects", projectId, "books", bookId);

  return onSnapshot(
    bookRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback(normalizeBookDocument(snapshot.id, projectId, snapshot.data()));
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export async function getBookById(uid: string, projectId: string, bookId: string) {
  const bookRef = doc(db, "users", uid, "projects", projectId, "books", bookId);
  const snapshot = await getDoc(bookRef);

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeBookDocument(snapshot.id, projectId, snapshot.data());
}

export async function createBookForProject(
  uid: string,
  projectId: string,
  values: NormalizedBookFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Book title is required.");
  }

  const bookId = await getAvailableBookId(uid, projectId, title);
  const bookRef = doc(db, "users", uid, "projects", projectId, "books", bookId);
  const bookDocument = buildBookDocument({
    id: bookId,
    projectId,
    values,
  });

  await setDoc(bookRef, {
    ...bookDocument,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return bookId;
}

export async function updateBookForProject(
  uid: string,
  projectId: string,
  bookId: string,
  values: NormalizedBookFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Book title is required.");
  }

  const bookRef = doc(db, "users", uid, "projects", projectId, "books", bookId);

  await setDoc(
    bookRef,
    {
      projectId,
      title,
      slug: slugifyBookTitle(title),
      summary: values.summary,
      description: values.description,
      status: values.status,
      isArchived: values.status === "archived",
      seriesOrder: values.seriesOrder,
      internalChronologyStart: values.internalChronologyStart,
      internalChronologyEnd: values.internalChronologyEnd,
      premise: values.premise,
      draftStage: values.draftStage,
      wordCountTarget: values.wordCountTarget,
      publicWikiSummary: values.publicWikiSummary,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

function normalizeBookDocument(
  documentId: string,
  projectId: string,
  data: Record<string, unknown> | undefined
): Book {
  const status = coerceBookStatus(data?.status);
  const explicitIsArchived = readBooleanOrNull(data?.isArchived);

  return {
    id: documentId,
    projectId: readString(data?.projectId) ?? projectId,
    title: readString(data?.title) ?? documentId,
    slug: readString(data?.slug) ?? slugifyBookTitle(readString(data?.title) ?? documentId),
    summary: readString(data?.summary) ?? "",
    description: readString(data?.description) ?? "",
    status,
    tags: readStringArray(data?.tags),
    isArchived: explicitIsArchived ?? status === "archived",
    canonLevel: coerceBookCanonLevel(data?.canonLevel),
    confidence: coerceBookConfidence(data?.confidence),
    seriesOrder: readNumberOrNull(data?.seriesOrder),
    internalChronologyStart: readNumberOrNull(data?.internalChronologyStart),
    internalChronologyEnd: readNumberOrNull(data?.internalChronologyEnd),
    premise: readString(data?.premise) ?? "",
    draftStage: coerceBookDraftStage(data?.draftStage),
    wordCountTarget: readNumberOrNull(data?.wordCountTarget),
    wordCountCurrent: readNumberOrNull(data?.wordCountCurrent) ?? 0,
    primaryThemes: readStringArray(data?.primaryThemes),
    mainCharacters: readStringArray(data?.mainCharacters),
    keyLocations: readStringArray(data?.keyLocations),
    relatedPlotThreads: readStringArray(data?.relatedPlotThreads),
    chapterIds: readStringArray(data?.chapterIds),
    sceneIds: readStringArray(data?.sceneIds),
    timelineEventIds: readStringArray(data?.timelineEventIds),
    publicWikiSummary: readString(data?.publicWikiSummary) ?? "",
    createdAt: readTimestamp(data?.createdAt),
    updatedAt: readTimestamp(data?.updatedAt),
  };
}

async function getAvailableBookId(uid: string, projectId: string, title: string) {
  const baseId = buildBookId(title);
  let candidateId = baseId;
  let suffix = 2;

  while ((await getDoc(doc(db, "users", uid, "projects", projectId, "books", candidateId))).exists()) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}

function buildBookId(title: string) {
  const normalized = slugifyBookTitle(title).replace(/-/g, "_");
  return `book_${normalized || "book"}`;
}

function compareBooks(left: Book, right: Book) {
  if (typeof left.seriesOrder === "number" && typeof right.seriesOrder === "number") {
    if (left.seriesOrder !== right.seriesOrder) {
      return left.seriesOrder - right.seriesOrder;
    }
  } else if (typeof left.seriesOrder === "number") {
    return -1;
  } else if (typeof right.seriesOrder === "number") {
    return 1;
  }

  return left.title.localeCompare(right.title);
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
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readBooleanOrNull(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function readTimestamp(value: unknown) {
  return value instanceof Timestamp ? value : null;
}
