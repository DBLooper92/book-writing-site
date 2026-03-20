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
  buildPlotThreadDocument,
  coercePlotThreadCanonLevel,
  coercePlotThreadConfidence,
  coercePlotThreadStatus,
  coercePlotThreadType,
  slugifyPlotThreadTitle,
  type NormalizedPlotThreadFormValues,
  type PlotThread,
} from "@/types/plot-thread";

export function getPlotThreadDocPath(uid: string, projectId: string, plotThreadId: string) {
  return doc(db, "users", uid, "projects", projectId, "plot_threads", plotThreadId).path;
}

export function observePlotThreadsForProject(
  uid: string,
  projectId: string,
  callback: (plotThreads: PlotThread[]) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const plotThreadsRef = collection(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "plot_threads"
  );

  return onSnapshot(
    plotThreadsRef,
    (snapshot) => {
      const plotThreads = snapshot.docs
        .map((plotThreadDoc) =>
          normalizePlotThreadDocument(plotThreadDoc.id, projectId, plotThreadDoc.data())
        )
        .sort((left, right) => left.title.localeCompare(right.title));

      callback(plotThreads);
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export function observePlotThreadById(
  uid: string,
  projectId: string,
  plotThreadId: string,
  callback: (plotThread: PlotThread | null) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const plotThreadRef = doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "plot_threads",
    plotThreadId
  );

  return onSnapshot(
    plotThreadRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback(normalizePlotThreadDocument(snapshot.id, projectId, snapshot.data()));
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export async function getPlotThreadById(
  uid: string,
  projectId: string,
  plotThreadId: string
) {
  const plotThreadRef = doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "plot_threads",
    plotThreadId
  );
  const snapshot = await getDoc(plotThreadRef);

  if (!snapshot.exists()) {
    return null;
  }

  return normalizePlotThreadDocument(snapshot.id, projectId, snapshot.data());
}

export async function createPlotThreadForProject(
  uid: string,
  projectId: string,
  values: NormalizedPlotThreadFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Plot thread title is required.");
  }

  const plotThreadId = await getAvailablePlotThreadId(uid, projectId, title);
  const plotThreadRef = doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "plot_threads",
    plotThreadId
  );
  const plotThreadDocument = buildPlotThreadDocument({
    id: plotThreadId,
    projectId,
    values,
  });

  await setDoc(plotThreadRef, {
    ...plotThreadDocument,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return plotThreadId;
}

export async function updatePlotThreadForProject(
  uid: string,
  projectId: string,
  plotThreadId: string,
  values: NormalizedPlotThreadFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Plot thread title is required.");
  }

  const plotThreadRef = doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "plot_threads",
    plotThreadId
  );

  await setDoc(
    plotThreadRef,
    {
      projectId,
      title,
      slug: slugifyPlotThreadTitle(title),
      summary: values.summary,
      description: values.description,
      status: values.status,
      isArchived: values.status === "archived",
      threadType: values.threadType,
      introducedInBookId: values.introducedInBookId,
      resolvedInBookId: values.resolvedInBookId,
      characterIds: values.characterIds,
      timelineEventIds: values.timelineEventIds,
      bookIds: values.bookIds,
      chapterIds: values.chapterIds,
      setupNotes: values.setupNotes,
      payoffNotes: values.payoffNotes,
      openQuestions: values.openQuestions,
      publicWikiSummary: values.publicWikiSummary,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

function normalizePlotThreadDocument(
  documentId: string,
  projectId: string,
  data: Record<string, unknown> | undefined
): PlotThread {
  const status = coercePlotThreadStatus(data?.status);
  const explicitIsArchived = readBooleanOrNull(data?.isArchived);

  return {
    id: documentId,
    projectId: readString(data?.projectId) ?? projectId,
    title: readString(data?.title) ?? documentId,
    slug:
      readString(data?.slug) ?? slugifyPlotThreadTitle(readString(data?.title) ?? documentId),
    summary: readString(data?.summary) ?? "",
    description: readString(data?.description) ?? "",
    status,
    tags: readStringArray(data?.tags),
    isArchived: explicitIsArchived ?? status === "archived",
    canonLevel: coercePlotThreadCanonLevel(data?.canonLevel),
    confidence: coercePlotThreadConfidence(data?.confidence),
    threadType: coercePlotThreadType(data?.threadType),
    introducedInBookId: readNullableString(data?.introducedInBookId),
    resolvedInBookId: readNullableString(data?.resolvedInBookId),
    characterIds: readStringArray(data?.characterIds),
    timelineEventIds: readStringArray(data?.timelineEventIds),
    bookIds: readStringArray(data?.bookIds),
    chapterIds: readStringArray(data?.chapterIds),
    sceneIds: readStringArray(data?.sceneIds),
    themeIds: readStringArray(data?.themeIds),
    noteIds: readStringArray(data?.noteIds),
    setupNotes: readStringArray(data?.setupNotes),
    payoffNotes: readStringArray(data?.payoffNotes),
    openQuestions: readStringArray(data?.openQuestions),
    publicWikiSummary: readString(data?.publicWikiSummary) ?? "",
    createdAt: readTimestamp(data?.createdAt),
    updatedAt: readTimestamp(data?.updatedAt),
  };
}

async function getAvailablePlotThreadId(uid: string, projectId: string, title: string) {
  const baseId = buildPlotThreadId(title);
  let candidateId = baseId;
  let suffix = 2;

  while (
    (await getDoc(doc(db, "users", uid, "projects", projectId, "plot_threads", candidateId)))
      .exists()
  ) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}

function buildPlotThreadId(title: string) {
  const normalized = slugifyPlotThreadTitle(title).replace(/-/g, "_");
  return `thread_${normalized || "thread"}`;
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
