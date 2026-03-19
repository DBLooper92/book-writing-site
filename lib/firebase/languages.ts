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
  buildLanguageDocument,
  coerceLanguageCanonLevel,
  coerceLanguageConfidence,
  coerceLanguageStatus,
  slugifyLanguageName,
  type Language,
  type NormalizedLanguageFormValues,
} from "@/types/language";

export function getLanguageDocPath(uid: string, projectId: string, languageId: string) {
  return doc(db, "users", uid, "projects", projectId, "languages", languageId).path;
}

export function observeLanguagesForProject(
  uid: string,
  projectId: string,
  callback: (languages: Language[]) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const languagesRef = collection(db, "users", uid, "projects", projectId, "languages");

  return onSnapshot(
    languagesRef,
    (snapshot) => {
      const languages = snapshot.docs
        .map((languageDoc) =>
          normalizeLanguageDocument(languageDoc.id, projectId, languageDoc.data())
        )
        .sort((left, right) => left.name.localeCompare(right.name));

      callback(languages);
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export function observeLanguageById(
  uid: string,
  projectId: string,
  languageId: string,
  callback: (language: Language | null) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const languageRef = doc(db, "users", uid, "projects", projectId, "languages", languageId);

  return onSnapshot(
    languageRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback(normalizeLanguageDocument(snapshot.id, projectId, snapshot.data()));
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export async function getLanguageById(
  uid: string,
  projectId: string,
  languageId: string
) {
  const languageRef = doc(db, "users", uid, "projects", projectId, "languages", languageId);
  const snapshot = await getDoc(languageRef);

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeLanguageDocument(snapshot.id, projectId, snapshot.data());
}

export async function createLanguageForProject(
  uid: string,
  projectId: string,
  values: NormalizedLanguageFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Language name is required.");
  }

  const languageId = await getAvailableLanguageId(uid, projectId, name);
  const languageRef = doc(db, "users", uid, "projects", projectId, "languages", languageId);
  const languageDocument = buildLanguageDocument({
    id: languageId,
    projectId,
    values,
  });

  await setDoc(languageRef, {
    ...languageDocument,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return languageId;
}

export async function updateLanguageForProject(
  uid: string,
  projectId: string,
  languageId: string,
  values: NormalizedLanguageFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Language name is required.");
  }

  const languageRef = doc(db, "users", uid, "projects", projectId, "languages", languageId);

  await setDoc(
    languageRef,
    {
      projectId,
      name,
      slug: slugifyLanguageName(name),
      summary: values.summary,
      description: values.description,
      status: values.status,
      isArchived: values.status === "archived",
      languageFamily: values.languageFamily,
      writingSystem: values.writingSystem,
      primaryRegions: values.primaryRegions,
      dialects: values.dialects,
      loanSources: values.loanSources,
      publicWikiSummary: values.publicWikiSummary,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

function normalizeLanguageDocument(
  documentId: string,
  projectId: string,
  data: Record<string, unknown> | undefined
): Language {
  const status = coerceLanguageStatus(data?.status);
  const explicitIsArchived = readBooleanOrNull(data?.isArchived);

  return {
    id: documentId,
    projectId: readString(data?.projectId) ?? projectId,
    name: readString(data?.name) ?? documentId,
    slug:
      readString(data?.slug) ?? slugifyLanguageName(readString(data?.name) ?? documentId),
    summary: readString(data?.summary) ?? "",
    description: readString(data?.description) ?? "",
    status,
    tags: readStringArray(data?.tags),
    isArchived: explicitIsArchived ?? status === "archived",
    canonLevel: coerceLanguageCanonLevel(data?.canonLevel),
    confidence: coerceLanguageConfidence(data?.confidence),
    languageFamily: readString(data?.languageFamily) ?? "",
    writingSystem: readString(data?.writingSystem) ?? "",
    primaryRegions: readStringArray(data?.primaryRegions),
    dialects: readStringArray(data?.dialects),
    loanSources: readStringArray(data?.loanSources),
    publicWikiSummary: readString(data?.publicWikiSummary) ?? "",
    createdAt: readTimestamp(data?.createdAt),
    updatedAt: readTimestamp(data?.updatedAt),
  };
}

async function getAvailableLanguageId(uid: string, projectId: string, name: string) {
  const baseId = buildLanguageId(name);
  let candidateId = baseId;
  let suffix = 2;

  while (
    (await getDoc(doc(db, "users", uid, "projects", projectId, "languages", candidateId)))
      .exists()
  ) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}

function buildLanguageId(name: string) {
  const normalized = slugifyLanguageName(name).replace(/-/g, "_");
  return `language_${normalized || "language"}`;
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
