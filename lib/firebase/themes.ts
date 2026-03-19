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
  buildThemeDocument,
  coerceThemeCanonLevel,
  coerceThemeConfidence,
  coerceThemeStatus,
  slugifyThemeName,
  type NormalizedThemeFormValues,
  type Theme,
} from "@/types/theme";

export function getThemeDocPath(uid: string, projectId: string, themeId: string) {
  return doc(db, "users", uid, "projects", projectId, "themes", themeId).path;
}

export function observeThemesForProject(
  uid: string,
  projectId: string,
  callback: (themes: Theme[]) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const themesRef = collection(db, "users", uid, "projects", projectId, "themes");

  return onSnapshot(
    themesRef,
    (snapshot) => {
      const themes = snapshot.docs
        .map((themeDoc) => normalizeThemeDocument(themeDoc.id, projectId, themeDoc.data()))
        .sort((left, right) => left.name.localeCompare(right.name));

      callback(themes);
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export function observeThemeById(
  uid: string,
  projectId: string,
  themeId: string,
  callback: (theme: Theme | null) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const themeRef = doc(db, "users", uid, "projects", projectId, "themes", themeId);

  return onSnapshot(
    themeRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback(normalizeThemeDocument(snapshot.id, projectId, snapshot.data()));
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export async function getThemeById(uid: string, projectId: string, themeId: string) {
  const themeRef = doc(db, "users", uid, "projects", projectId, "themes", themeId);
  const snapshot = await getDoc(themeRef);

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeThemeDocument(snapshot.id, projectId, snapshot.data());
}

export async function createThemeForProject(
  uid: string,
  projectId: string,
  values: NormalizedThemeFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Theme name is required.");
  }

  const themeId = await getAvailableThemeId(uid, projectId, name);
  const themeRef = doc(db, "users", uid, "projects", projectId, "themes", themeId);
  const themeDocument = buildThemeDocument({
    id: themeId,
    projectId,
    values,
  });

  await setDoc(themeRef, {
    ...themeDocument,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return themeId;
}

export async function updateThemeForProject(
  uid: string,
  projectId: string,
  themeId: string,
  values: NormalizedThemeFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Theme name is required.");
  }

  const themeRef = doc(db, "users", uid, "projects", projectId, "themes", themeId);

  await setDoc(
    themeRef,
    {
      projectId,
      name,
      slug: slugifyThemeName(name),
      summary: values.summary,
      description: values.description,
      status: values.status,
      isArchived: values.status === "archived",
      centralQuestion: values.centralQuestion,
      associatedBookIds: values.associatedBookIds,
      associatedCharacterIds: values.associatedCharacterIds,
      associatedTimelineEventIds: values.associatedTimelineEventIds,
      associatedEraIds: values.associatedEraIds,
      associatedPlotThreadIds: values.associatedPlotThreadIds,
      motifs: values.motifs,
      publicWikiSummary: values.publicWikiSummary,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

function normalizeThemeDocument(
  documentId: string,
  projectId: string,
  data: Record<string, unknown> | undefined
): Theme {
  const status = coerceThemeStatus(data?.status);
  const explicitIsArchived = readBooleanOrNull(data?.isArchived);

  return {
    id: documentId,
    projectId: readString(data?.projectId) ?? projectId,
    name: readString(data?.name) ?? documentId,
    slug: readString(data?.slug) ?? slugifyThemeName(readString(data?.name) ?? documentId),
    summary: readString(data?.summary) ?? "",
    description: readString(data?.description) ?? "",
    status,
    tags: readStringArray(data?.tags),
    isArchived: explicitIsArchived ?? status === "archived",
    canonLevel: coerceThemeCanonLevel(data?.canonLevel),
    confidence: coerceThemeConfidence(data?.confidence),
    centralQuestion: readString(data?.centralQuestion) ?? "",
    associatedBookIds: readStringArray(data?.associatedBookIds),
    associatedCharacterIds: readStringArray(data?.associatedCharacterIds),
    associatedTimelineEventIds: readStringArray(
      data?.associatedTimelineEventIds ?? data?.associatedEventIds
    ),
    associatedEraIds: readStringArray(data?.associatedEraIds),
    associatedPlotThreadIds: readStringArray(
      data?.associatedPlotThreadIds ?? data?.plotThreadIds
    ),
    motifs: readStringArray(data?.motifs),
    publicWikiSummary: readString(data?.publicWikiSummary) ?? "",
    createdAt: readTimestamp(data?.createdAt),
    updatedAt: readTimestamp(data?.updatedAt),
  };
}

async function getAvailableThemeId(uid: string, projectId: string, name: string) {
  const baseId = buildThemeId(name);
  let candidateId = baseId;
  let suffix = 2;

  while (
    (await getDoc(doc(db, "users", uid, "projects", projectId, "themes", candidateId))).exists()
  ) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}

function buildThemeId(name: string) {
  const normalized = slugifyThemeName(name).replace(/-/g, "_");
  return `theme_${normalized || "theme"}`;
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
