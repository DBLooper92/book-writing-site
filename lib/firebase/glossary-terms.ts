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
  buildGlossaryTermDocument,
  coerceGlossaryTermCanonLevel,
  coerceGlossaryTermConfidence,
  coerceGlossaryTermStatus,
  slugifyGlossaryTermTitle,
  type GlossaryTerm,
  type NormalizedGlossaryTermFormValues,
} from "@/types/glossary-term";

export function getGlossaryTermDocPath(
  uid: string,
  projectId: string,
  glossaryTermId: string
) {
  return doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "glossary_terms",
    glossaryTermId
  ).path;
}

export function observeGlossaryTermsForProject(
  uid: string,
  projectId: string,
  callback: (glossaryTerms: GlossaryTerm[]) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const glossaryTermsRef = collection(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "glossary_terms"
  );

  return onSnapshot(
    glossaryTermsRef,
    (snapshot) => {
      const glossaryTerms = snapshot.docs
        .map((glossaryTermDoc) =>
          normalizeGlossaryTermDocument(glossaryTermDoc.id, projectId, glossaryTermDoc.data())
        )
        .sort((left, right) => left.title.localeCompare(right.title));

      callback(glossaryTerms);
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export function observeGlossaryTermById(
  uid: string,
  projectId: string,
  glossaryTermId: string,
  callback: (glossaryTerm: GlossaryTerm | null) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const glossaryTermRef = doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "glossary_terms",
    glossaryTermId
  );

  return onSnapshot(
    glossaryTermRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback(normalizeGlossaryTermDocument(snapshot.id, projectId, snapshot.data()));
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export async function getGlossaryTermById(
  uid: string,
  projectId: string,
  glossaryTermId: string
) {
  const glossaryTermRef = doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "glossary_terms",
    glossaryTermId
  );
  const snapshot = await getDoc(glossaryTermRef);

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeGlossaryTermDocument(snapshot.id, projectId, snapshot.data());
}

export async function createGlossaryTermForProject(
  uid: string,
  projectId: string,
  values: NormalizedGlossaryTermFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Glossary term title is required.");
  }

  const glossaryTermId = await getAvailableGlossaryTermId(uid, projectId, title);
  const glossaryTermRef = doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "glossary_terms",
    glossaryTermId
  );
  const glossaryTermDocument = buildGlossaryTermDocument({
    id: glossaryTermId,
    projectId,
    values,
  });

  await setDoc(glossaryTermRef, {
    ...glossaryTermDocument,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return glossaryTermId;
}

export async function updateGlossaryTermForProject(
  uid: string,
  projectId: string,
  glossaryTermId: string,
  values: NormalizedGlossaryTermFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Glossary term title is required.");
  }

  const glossaryTermRef = doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "glossary_terms",
    glossaryTermId
  );

  await setDoc(
    glossaryTermRef,
    {
      projectId,
      title,
      slug: slugifyGlossaryTermTitle(title),
      summary: values.summary,
      description: values.description,
      status: values.status,
      isArchived: values.status === "archived",
      term: values.term,
      definition: values.definition,
      category: values.category,
      relatedEntityTypes: values.relatedEntityTypes,
      relatedEntityIds: values.relatedEntityIds,
      publicWikiSummary: values.publicWikiSummary,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

function normalizeGlossaryTermDocument(
  documentId: string,
  projectId: string,
  data: Record<string, unknown> | undefined
): GlossaryTerm {
  const status = coerceGlossaryTermStatus(data?.status);
  const explicitIsArchived = readBooleanOrNull(data?.isArchived);
  const title = readString(data?.title) ?? documentId;
  const term = readString(data?.term) ?? title;

  return {
    id: documentId,
    projectId: readString(data?.projectId) ?? projectId,
    title,
    slug: readString(data?.slug) ?? slugifyGlossaryTermTitle(title),
    summary: readString(data?.summary) ?? "",
    description: readString(data?.description) ?? "",
    status,
    tags: readStringArray(data?.tags),
    isArchived: explicitIsArchived ?? status === "archived",
    canonLevel: coerceGlossaryTermCanonLevel(data?.canonLevel),
    confidence: coerceGlossaryTermConfidence(data?.confidence),
    term,
    definition: readString(data?.definition) ?? "",
    category: readString(data?.category) ?? "",
    relatedEntityTypes: readStringArray(data?.relatedEntityTypes),
    relatedEntityIds: readStringArray(data?.relatedEntityIds),
    publicWikiSummary: readString(data?.publicWikiSummary) ?? "",
    createdAt: readTimestamp(data?.createdAt),
    updatedAt: readTimestamp(data?.updatedAt),
  };
}

async function getAvailableGlossaryTermId(
  uid: string,
  projectId: string,
  title: string
) {
  const baseId = buildGlossaryTermId(title);
  let candidateId = baseId;
  let suffix = 2;

  while (
    (
      await getDoc(
        doc(db, "users", uid, "projects", projectId, "glossary_terms", candidateId)
      )
    ).exists()
  ) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}

function buildGlossaryTermId(title: string) {
  const normalized = slugifyGlossaryTermTitle(title).replace(/-/g, "_");
  return `term_${normalized || "term"}`;
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
