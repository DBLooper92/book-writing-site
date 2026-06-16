import "client-only";

import { useMemo, useSyncExternalStore } from "react";

import type { TimelineEvent } from "@/types/timeline-event";

const TIMELINE_BOOKMARK_COLLECTIONS_STORAGE_KEY =
  "book-bible:timeline:bookmark-collections";
const TIMELINE_BOOKMARK_COLLECTIONS_CHANGE_EVENT =
  "book-bible:timeline:bookmark-collections-change";
export const TIMELINE_BOOKMARK_COLLECTION_TAG_PREFIX = "bookmark-collection:";
export const TIMELINE_BOOKMARK_COLLECTION_UNCATEGORIZED_ID = "__uncategorized__";
export const TIMELINE_BOOKMARK_COLLECTION_DEFAULT_COLOR = "#f59e0b";

export type TimelineBookmarkCollection = {
  id: string;
  name: string;
  color: string;
};

export const TIMELINE_BOOKMARK_COLOR_OPTIONS: ReadonlyArray<{
  color: string;
  label: string;
}> = [
  { color: "#f59e0b", label: "Amber" },
  { color: "#ef4444", label: "Red" },
  { color: "#f97316", label: "Orange" },
  { color: "#eab308", label: "Gold" },
  { color: "#84cc16", label: "Lime" },
  { color: "#22c55e", label: "Green" },
  { color: "#14b8a6", label: "Teal" },
  { color: "#0ea5e9", label: "Sky" },
  { color: "#6366f1", label: "Indigo" },
  { color: "#a855f7", label: "Violet" },
  { color: "#ec4899", label: "Pink" },
];

const DEFAULT_COLLECTIONS_JSON = "[]";
type BookmarkCollectionsStore = Record<string, TimelineBookmarkCollection[]>;

export function useTimelineBookmarkCollections(projectId: string) {
  const snapshot = useSyncExternalStore(
    subscribeTimelineBookmarkCollections,
    () => readTimelineBookmarkCollectionsSnapshot(projectId),
    () => DEFAULT_COLLECTIONS_JSON
  );

  return useMemo(
    () => JSON.parse(snapshot) as TimelineBookmarkCollection[],
    [snapshot]
  );
}

export function loadTimelineBookmarkCollections(
  projectId: string
): TimelineBookmarkCollection[] {
  return readBookmarkCollectionsStore()[projectId] ?? [];
}

export function saveTimelineBookmarkCollections(
  projectId: string,
  collections: TimelineBookmarkCollection[]
) {
  if (typeof window === "undefined") {
    return;
  }

  const store = readBookmarkCollectionsStore();
  store[projectId] = collections;
  window.localStorage.setItem(
    TIMELINE_BOOKMARK_COLLECTIONS_STORAGE_KEY,
    JSON.stringify(store)
  );
  window.dispatchEvent(new Event(TIMELINE_BOOKMARK_COLLECTIONS_CHANGE_EVENT));
}

export function createTimelineBookmarkCollection(
  projectId: string,
  input: { color: string; name: string }
) {
  const collections = loadTimelineBookmarkCollections(projectId);
  const collection: TimelineBookmarkCollection = {
    id: createTimelineBookmarkCollectionId(),
    name: input.name.trim(),
    color: normalizeTimelineBookmarkCollectionColor(input.color),
  };

  saveTimelineBookmarkCollections(projectId, [...collections, collection]);
  return collection;
}

export function upsertTimelineBookmarkCollection(
  projectId: string,
  collection: TimelineBookmarkCollection
) {
  const collections = loadTimelineBookmarkCollections(projectId);
  const nextCollections = [
    ...collections.filter((item) => item.id !== collection.id),
    {
      id: collection.id,
      name: collection.name.trim(),
      color: normalizeTimelineBookmarkCollectionColor(collection.color),
    },
  ];

  saveTimelineBookmarkCollections(projectId, nextCollections);
}

export function getTimelineEventBookmarkCollectionId(timelineEvent: Pick<TimelineEvent, "tags">) {
  const tag = timelineEvent.tags.find((value) =>
    value.startsWith(TIMELINE_BOOKMARK_COLLECTION_TAG_PREFIX)
  );

  if (!tag) {
    return null;
  }

  const collectionId = tag.slice(TIMELINE_BOOKMARK_COLLECTION_TAG_PREFIX.length).trim();
  return collectionId || null;
}

export function buildTimelineEventBookmarkCollectionTag(collectionId: string) {
  return `${TIMELINE_BOOKMARK_COLLECTION_TAG_PREFIX}${collectionId.trim()}`;
}

export function getTimelineBookmarkCollectionById(
  collections: ReadonlyArray<TimelineBookmarkCollection>,
  collectionId: string | null
) {
  if (!collectionId) {
    return null;
  }

  return collections.find((collection) => collection.id === collectionId) ?? null;
}

export function getTimelineEventBookmarkCollectionColor(
  timelineEvent: Pick<TimelineEvent, "tags">,
  collections: ReadonlyArray<TimelineBookmarkCollection>
) {
  const collectionId = getTimelineEventBookmarkCollectionId(timelineEvent);
  const collection = getTimelineBookmarkCollectionById(collections, collectionId);
  return collection?.color ?? TIMELINE_BOOKMARK_COLLECTION_DEFAULT_COLOR;
}

export function isTimelineEventBookmarked(timelineEvent: Pick<TimelineEvent, "tags">) {
  return timelineEvent.tags.includes("bookmarked");
}

export function formatTimelineBookmarkCollectionSummary(
  selectedCollectionIds: string[],
  collections: ReadonlyArray<TimelineBookmarkCollection>
) {
  if (selectedCollectionIds.length === 0) {
    return "All bookmarked";
  }

  const selectedCollections = selectedCollectionIds
    .map((collectionId) =>
      collectionId === TIMELINE_BOOKMARK_COLLECTION_UNCATEGORIZED_ID
        ? {
            color: TIMELINE_BOOKMARK_COLLECTION_DEFAULT_COLOR,
            name: "Uncategorized",
          }
        : getTimelineBookmarkCollectionById(collections, collectionId)
    )
    .filter(
      (collection): collection is { color: string; name: string } => Boolean(collection)
    );

  if (selectedCollections.length === 0) {
    return "All bookmarked";
  }

  if (selectedCollections.length === 1) {
    return selectedCollections[0].name;
  }

  if (selectedCollections.length === 2) {
    return `${selectedCollections[0].name}, ${selectedCollections[1].name}`;
  }

  return `${selectedCollections.length} collections`;
}

export function normalizeTimelineBookmarkCollectionColor(color: string) {
  const normalized = color.trim().toLowerCase();
  const match = normalized.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);

  if (!match) {
    return TIMELINE_BOOKMARK_COLLECTION_DEFAULT_COLOR;
  }

  const hex = match[1];

  if (hex.length === 3) {
    return `#${hex
      .split("")
      .map((character) => `${character}${character}`)
      .join("")}`;
  }

  return `#${hex}`;
}

export function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "").trim();

  if (normalized.length !== 3 && normalized.length !== 6) {
    return `rgba(245, 158, 11, ${alpha})`;
  }

  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((character) => `${character}${character}`)
          .join("")
      : normalized;

  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);

  if ([red, green, blue].some((value) => Number.isNaN(value))) {
    return `rgba(245, 158, 11, ${alpha})`;
  }

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function readTimelineBookmarkCollectionsSnapshot(projectId: string): string {
  if (typeof window === "undefined") {
    return "[]";
  }

  const collections = readBookmarkCollectionsStore()[projectId] ?? [];
  return JSON.stringify(collections);
}

function readBookmarkCollectionsStore(): BookmarkCollectionsStore {
  if (typeof window === "undefined") {
    return {};
  }

  const rawValue = window.localStorage.getItem(TIMELINE_BOOKMARK_COLLECTIONS_STORAGE_KEY);

  if (!rawValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).map(([projectId, value]) => [
        projectId,
        normalizeTimelineBookmarkCollectionArray(value),
      ])
    ) as BookmarkCollectionsStore;
  } catch {
    window.localStorage.removeItem(TIMELINE_BOOKMARK_COLLECTIONS_STORAGE_KEY);
    return {};
  }
}

function normalizeTimelineBookmarkCollectionArray(value: unknown): TimelineBookmarkCollection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((collection): TimelineBookmarkCollection | null => {
      if (!collection || typeof collection !== "object" || Array.isArray(collection)) {
        return null;
      }

      const candidate = collection as Partial<TimelineBookmarkCollection>;
      const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
      const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
      const color = normalizeTimelineBookmarkCollectionColor(
        typeof candidate.color === "string" ? candidate.color : TIMELINE_BOOKMARK_COLLECTION_DEFAULT_COLOR
      );

      if (!id || !name) {
        return null;
      }

      return { id, name, color };
    })
    .filter((collection): collection is TimelineBookmarkCollection => Boolean(collection));
}

function subscribeTimelineBookmarkCollections(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === TIMELINE_BOOKMARK_COLLECTIONS_STORAGE_KEY) {
      onStoreChange();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(TIMELINE_BOOKMARK_COLLECTIONS_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(TIMELINE_BOOKMARK_COLLECTIONS_CHANGE_EVENT, onStoreChange);
  };
}

function createTimelineBookmarkCollectionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `bookmark-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
