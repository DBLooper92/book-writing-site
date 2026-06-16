import "client-only";

import type {
  TimelineBrainDumpComposerCard,
  TimelineBrainDumpComposerSession,
} from "@/types/ai-brain-dump";

const STORAGE_KEY_PREFIX = "book-bible:timeline:braindump-composer";

export function createEmptyBrainDumpComposerSession(
  projectId: string,
  insertionItemId: string | null
): TimelineBrainDumpComposerSession {
  const now = new Date().toISOString();

  return {
    cards: [createBrainDumpComposerCard("ai")],
    createdAt: now,
    insertionItemId,
    projectId,
    sessionId: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    updatedAt: now,
  };
}

export function createBrainDumpComposerCard(type: "ai" | "manual"): TimelineBrainDumpComposerCard {
  const now = new Date().toISOString();

  return {
    aiDraft: null,
    bookmarkCollectionId: null,
    bookmarked: false,
    cardId: `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    error: null,
    publishedTimelineEventId: null,
    status: "idle",
    text: "",
    type,
    updatedAt: now,
  };
}

export function loadBrainDumpComposerSession(
  projectId: string,
  insertionItemId: string | null
): TimelineBrainDumpComposerSession | null {
  if (typeof window === "undefined" || !projectId.trim()) {
    return null;
  }

  const rawValue = window.localStorage.getItem(getStorageKey(projectId, insertionItemId));

  if (!rawValue) {
    return null;
  }

  try {
    return normalizeSession(JSON.parse(rawValue) as unknown, projectId, insertionItemId);
  } catch {
    return null;
  }
}

export function saveBrainDumpComposerSession(
  session: TimelineBrainDumpComposerSession | null
) {
  if (typeof window === "undefined" || !session?.projectId.trim()) {
    return;
  }

  const normalized = normalizeSession(session, session.projectId, session.insertionItemId);
  window.localStorage.setItem(
    getStorageKey(normalized.projectId, normalized.insertionItemId),
    JSON.stringify(normalized)
  );
}

export function clearBrainDumpComposerSession(
  projectId: string,
  insertionItemId: string | null
) {
  if (typeof window === "undefined" || !projectId.trim()) {
    return;
  }

  window.localStorage.removeItem(getStorageKey(projectId, insertionItemId));
}

function getStorageKey(projectId: string, insertionItemId: string | null) {
  return `${STORAGE_KEY_PREFIX}:${projectId.trim()}:${String(insertionItemId ?? "root")}`;
}

function normalizeSession(
  value: unknown,
  projectId: string,
  insertionItemId: string | null
): TimelineBrainDumpComposerSession {
  const now = new Date().toISOString();
  const fallback = createEmptyBrainDumpComposerSession(projectId, insertionItemId);

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }

  const parsed = value as Partial<TimelineBrainDumpComposerSession>;
  const cards = Array.isArray(parsed.cards)
    ? parsed.cards.map((card, index) => normalizeCard(card, index))
    : fallback.cards;

  return {
    cards: cards.length > 0 ? cards : fallback.cards,
    createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : now,
    insertionItemId,
    projectId,
    sessionId:
      typeof parsed.sessionId === "string" && parsed.sessionId.trim()
        ? parsed.sessionId
        : fallback.sessionId,
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : now,
  };
}

function normalizeCard(
  value: unknown,
  index: number
): TimelineBrainDumpComposerCard {
  const fallback = createBrainDumpComposerCard(index === 0 ? "ai" : "manual");

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }

  const parsed = value as Partial<TimelineBrainDumpComposerCard>;

  return {
    aiDraft:
      parsed.aiDraft && typeof parsed.aiDraft === "object" ? (parsed.aiDraft as TimelineBrainDumpComposerCard["aiDraft"]) : null,
    bookmarkCollectionId:
      typeof parsed.bookmarkCollectionId === "string" ? parsed.bookmarkCollectionId : null,
    bookmarked: typeof parsed.bookmarked === "boolean" ? parsed.bookmarked : false,
    cardId:
      typeof parsed.cardId === "string" && parsed.cardId.trim()
        ? parsed.cardId
        : fallback.cardId,
    createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : fallback.createdAt,
    error: typeof parsed.error === "string" ? parsed.error : null,
    publishedTimelineEventId:
      typeof parsed.publishedTimelineEventId === "string"
        ? parsed.publishedTimelineEventId
        : null,
    status:
      parsed.status === "processing" ||
      parsed.status === "ready" ||
      parsed.status === "failed" ||
      parsed.status === "published"
        ? parsed.status
        : "idle",
    text: typeof parsed.text === "string" ? parsed.text : "",
    type: parsed.type === "manual" ? "manual" : "ai",
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : fallback.updatedAt,
  };
}
