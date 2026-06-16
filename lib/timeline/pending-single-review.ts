import type { TimelineSingleEventBrainDumpReviewState } from "@/types/ai-brain-dump";

const PENDING_SINGLE_REVIEW_STORAGE_KEY_PREFIX = "book-bible:timeline:pending-single-review";

export function loadPendingSingleReviewMap(projectId: string) {
  if (typeof window === "undefined" || !projectId.trim()) {
    return {} as Record<string, TimelineSingleEventBrainDumpReviewState>;
  }

  const rawValue = window.localStorage.getItem(getStorageKey(projectId));

  if (!rawValue) {
    return {} as Record<string, TimelineSingleEventBrainDumpReviewState>;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && "records" in parsed) {
      const records = (parsed as { records?: unknown }).records;
      return normalizeRecordMap(records);
    }

    return normalizeRecordMap(parsed);
  } catch {
    return {} as Record<string, TimelineSingleEventBrainDumpReviewState>;
  }
}

export function savePendingSingleReviewMap(
  projectId: string,
  records: Record<string, TimelineSingleEventBrainDumpReviewState>
) {
  if (typeof window === "undefined" || !projectId.trim()) {
    return;
  }

  window.localStorage.setItem(
    getStorageKey(projectId),
    JSON.stringify({
      records: normalizeRecordMap(records),
    })
  );
}

function getStorageKey(projectId: string) {
  return `${PENDING_SINGLE_REVIEW_STORAGE_KEY_PREFIX}:${projectId.trim()}`;
}

function normalizeRecordMap(
  records: unknown
) {
  if (!records || typeof records !== "object" || Array.isArray(records)) {
    return {} as Record<string, TimelineSingleEventBrainDumpReviewState>;
  }

  return Object.fromEntries(
    Object.entries(records).filter(([insertionItemId, record]) => {
      return (
        Boolean(insertionItemId.trim()) &&
        Boolean(record) &&
        typeof record === "object" &&
        !Array.isArray(record) &&
        (record as TimelineSingleEventBrainDumpReviewState).status === "pending"
      );
    })
  ) as Record<string, TimelineSingleEventBrainDumpReviewState>;
}
