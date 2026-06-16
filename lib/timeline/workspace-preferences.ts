import "client-only";
import { useSyncExternalStore } from "react";

const TIMELINE_WORKSPACE_PREFERENCES_STORAGE_KEY =
  "book-bible:timeline:workspace-preferences";
const TIMELINE_WORKSPACE_PREFERENCES_CHANGE_EVENT =
  "book-bible:timeline:workspace-preferences-change";

export type TimelineWorkspacePreferences = {
  filtersCollapsed: boolean;
  filtersHintSeen: boolean;
  scrollEventDisplayMode: TimelineWorkspaceScrollEventDisplayMode;
};

export type TimelineWorkspaceScrollEventDisplayMode =
  | "descriptions"
  | "both"
  | "summary";

const DEFAULT_TIMELINE_WORKSPACE_PREFERENCES: TimelineWorkspacePreferences = {
  filtersCollapsed: true,
  filtersHintSeen: false,
  scrollEventDisplayMode: "descriptions",
};

const DEFAULT_TIMELINE_WORKSPACE_PREFERENCES_JSON = JSON.stringify(
  DEFAULT_TIMELINE_WORKSPACE_PREFERENCES
);

export function loadTimelineWorkspacePreferences(): TimelineWorkspacePreferences {
  return JSON.parse(readTimelineWorkspacePreferencesSnapshot()) as TimelineWorkspacePreferences;
}

export function useTimelineWorkspacePreferences(): TimelineWorkspacePreferences {
  const snapshot = useSyncExternalStore(
    subscribeTimelineWorkspacePreferences,
    readTimelineWorkspacePreferencesSnapshot,
    () => DEFAULT_TIMELINE_WORKSPACE_PREFERENCES_JSON
  );

  return JSON.parse(snapshot) as TimelineWorkspacePreferences;
}

function readTimelineWorkspacePreferencesSnapshot() {
  if (typeof window === "undefined") {
    return DEFAULT_TIMELINE_WORKSPACE_PREFERENCES_JSON;
  }

  const rawValue = window.localStorage.getItem(TIMELINE_WORKSPACE_PREFERENCES_STORAGE_KEY);

  if (!rawValue) {
    return DEFAULT_TIMELINE_WORKSPACE_PREFERENCES_JSON;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return DEFAULT_TIMELINE_WORKSPACE_PREFERENCES_JSON;
    }

    const normalized: TimelineWorkspacePreferences = {
      filtersCollapsed:
        typeof (parsed as { filtersCollapsed?: unknown }).filtersCollapsed === "boolean"
          ? (parsed as { filtersCollapsed: boolean }).filtersCollapsed
          : DEFAULT_TIMELINE_WORKSPACE_PREFERENCES.filtersCollapsed,
      filtersHintSeen:
        typeof (parsed as { filtersHintSeen?: unknown }).filtersHintSeen === "boolean"
          ? (parsed as { filtersHintSeen: boolean }).filtersHintSeen
          : DEFAULT_TIMELINE_WORKSPACE_PREFERENCES.filtersHintSeen,
      scrollEventDisplayMode:
        (parsed as { scrollEventDisplayMode?: unknown }).scrollEventDisplayMode === "both" ||
        (parsed as { scrollEventDisplayMode?: unknown }).scrollEventDisplayMode === "summary" ||
        (parsed as { scrollEventDisplayMode?: unknown }).scrollEventDisplayMode === "descriptions"
          ? ((parsed as { scrollEventDisplayMode: TimelineWorkspacePreferences["scrollEventDisplayMode"] })
              .scrollEventDisplayMode)
          : DEFAULT_TIMELINE_WORKSPACE_PREFERENCES.scrollEventDisplayMode,
    };

    return JSON.stringify(normalized);
  } catch {
    window.localStorage.removeItem(TIMELINE_WORKSPACE_PREFERENCES_STORAGE_KEY);
    return DEFAULT_TIMELINE_WORKSPACE_PREFERENCES_JSON;
  }
}

export function saveTimelineWorkspacePreferences(
  preferences: TimelineWorkspacePreferences
) {
  if (typeof window === "undefined") {
    return;
  }

  const serialized = JSON.stringify(preferences);
  window.localStorage.setItem(TIMELINE_WORKSPACE_PREFERENCES_STORAGE_KEY, serialized);
  window.dispatchEvent(new Event(TIMELINE_WORKSPACE_PREFERENCES_CHANGE_EVENT));
}

function subscribeTimelineWorkspacePreferences(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === TIMELINE_WORKSPACE_PREFERENCES_STORAGE_KEY) {
      onStoreChange();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(TIMELINE_WORKSPACE_PREFERENCES_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(TIMELINE_WORKSPACE_PREFERENCES_CHANGE_EVENT, onStoreChange);
  };
}
