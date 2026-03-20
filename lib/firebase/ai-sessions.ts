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
  buildAiSessionDocument,
  coerceAiSessionCanonLevel,
  coerceAiSessionConfidence,
  coerceAiSessionStatus,
  coerceAiSessionType,
  slugifyAiSessionTitle,
  type AiSession,
  type NormalizedAiSessionFormValues,
} from "@/types/ai-session";

export function getAiSessionDocPath(uid: string, projectId: string, aiSessionId: string) {
  return doc(db, "users", uid, "projects", projectId, "ai_sessions", aiSessionId).path;
}

export function observeAiSessionsForProject(
  uid: string,
  projectId: string,
  callback: (aiSessions: AiSession[]) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const aiSessionsRef = collection(db, "users", uid, "projects", projectId, "ai_sessions");

  return onSnapshot(
    aiSessionsRef,
    (snapshot) => {
      const aiSessions = snapshot.docs
        .map((aiSessionDoc) =>
          normalizeAiSessionDocument(aiSessionDoc.id, projectId, aiSessionDoc.data())
        )
        .sort((left, right) => left.title.localeCompare(right.title));

      callback(aiSessions);
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export function observeAiSessionById(
  uid: string,
  projectId: string,
  aiSessionId: string,
  callback: (aiSession: AiSession | null) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const aiSessionRef = doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "ai_sessions",
    aiSessionId
  );

  return onSnapshot(
    aiSessionRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback(normalizeAiSessionDocument(snapshot.id, projectId, snapshot.data()));
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export async function getAiSessionById(
  uid: string,
  projectId: string,
  aiSessionId: string
) {
  const aiSessionRef = doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "ai_sessions",
    aiSessionId
  );
  const snapshot = await getDoc(aiSessionRef);

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeAiSessionDocument(snapshot.id, projectId, snapshot.data());
}

export async function createAiSessionForProject(
  uid: string,
  projectId: string,
  values: NormalizedAiSessionFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("AI session title is required.");
  }

  const aiSessionId = await getAvailableAiSessionId(uid, projectId, title);
  const aiSessionRef = doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "ai_sessions",
    aiSessionId
  );
  const aiSessionDocument = buildAiSessionDocument({
    id: aiSessionId,
    projectId,
    values,
  });

  await setDoc(aiSessionRef, {
    ...aiSessionDocument,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return aiSessionId;
}

export async function updateAiSessionForProject(
  uid: string,
  projectId: string,
  aiSessionId: string,
  values: NormalizedAiSessionFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("AI session title is required.");
  }

  const aiSessionRef = doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "ai_sessions",
    aiSessionId
  );

  await setDoc(
    aiSessionRef,
    {
      projectId,
      title,
      slug: slugifyAiSessionTitle(title),
      summary: values.summary,
      description: values.description,
      status: values.status,
      isArchived: values.status === "archived",
      sessionType: values.sessionType,
      provider: values.provider,
      model: values.model,
      purpose: values.purpose,
      promptExcerpt: values.promptExcerpt,
      outputSummary: values.outputSummary,
      linkedEntityTypes: values.linkedEntityTypes,
      linkedEntityIds: values.linkedEntityIds,
      messagesCount: values.messagesCount,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

function normalizeAiSessionDocument(
  documentId: string,
  projectId: string,
  data: Record<string, unknown> | undefined
): AiSession {
  const status = coerceAiSessionStatus(data?.status);
  const explicitIsArchived = readBooleanOrNull(data?.isArchived);

  return {
    id: documentId,
    projectId: readString(data?.projectId) ?? projectId,
    title: readString(data?.title) ?? documentId,
    slug: readString(data?.slug) ?? slugifyAiSessionTitle(readString(data?.title) ?? documentId),
    summary: readString(data?.summary) ?? "",
    description: readString(data?.description) ?? "",
    status,
    tags: readStringArray(data?.tags),
    isArchived: explicitIsArchived ?? status === "archived",
    canonLevel: coerceAiSessionCanonLevel(data?.canonLevel),
    confidence: coerceAiSessionConfidence(data?.confidence),
    sessionType: coerceAiSessionType(data?.sessionType),
    provider: readString(data?.provider) ?? "",
    model: readString(data?.model) ?? "",
    purpose: readString(data?.purpose) ?? "",
    promptExcerpt: readString(data?.promptExcerpt) ?? "",
    outputSummary: readString(data?.outputSummary) ?? "",
    linkedEntityTypes: readStringArray(data?.linkedEntityTypes),
    linkedEntityIds: readStringArray(data?.linkedEntityIds),
    messagesCount: readNumberOrNull(data?.messagesCount),
    createdAt: readTimestamp(data?.createdAt),
    updatedAt: readTimestamp(data?.updatedAt),
  };
}

async function getAvailableAiSessionId(uid: string, projectId: string, title: string) {
  const baseId = buildAiSessionId(title);
  let candidateId = baseId;
  let suffix = 2;

  while (
    (
      await getDoc(doc(db, "users", uid, "projects", projectId, "ai_sessions", candidateId))
    ).exists()
  ) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}

function buildAiSessionId(title: string) {
  const normalized = slugifyAiSessionTitle(title).replace(/-/g, "_");
  return `session_${normalized || "ai_session"}`;
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
