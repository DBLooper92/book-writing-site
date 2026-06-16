"use client";

import { useEffect, useState } from "react";

import { TimelineColorWheelPicker } from "@/components/timeline/timeline-color-wheel-picker";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import {
  type TimelineBookmarkCollection,
  TIMELINE_BOOKMARK_COLLECTION_DEFAULT_COLOR,
  normalizeTimelineBookmarkCollectionColor,
} from "@/lib/timeline/bookmark-collections";

type TimelineBookmarkCollectionPickerProps = {
  collections: TimelineBookmarkCollection[];
  initialCollectionId: string | null;
  open: boolean;
  onClose: () => void;
  onSave: (
    selection:
      | { mode: "existing"; collectionId: string }
      | { mode: "new"; collectionColor: string; collectionName: string }
  ) => Promise<void> | void;
};

export function TimelineBookmarkCollectionPicker({
  collections,
  initialCollectionId,
  open,
  onClose,
  onSave,
}: TimelineBookmarkCollectionPickerProps) {
  const [mode, setMode] = useState<"existing" | "new">(
    collections.length > 0 ? "existing" : "new"
  );
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>(
    initialCollectionId ?? collections[0]?.id ?? ""
  );
  const [collectionName, setCollectionName] = useState("");
  const [collectionColor, setCollectionColor] = useState(TIMELINE_BOOKMARK_COLLECTION_DEFAULT_COLOR);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useScrollLock(open);

  useEffect(() => {
    if (!open) {
      return;
    }

    const nextMode = collections.length > 0 ? "existing" : "new";
    setMode(nextMode);
    setSelectedCollectionId(initialCollectionId ?? collections[0]?.id ?? "");
    setCollectionName("");
    setCollectionColor(TIMELINE_BOOKMARK_COLLECTION_DEFAULT_COLOR);
    setError(null);
  }, [collections, initialCollectionId, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      if (mode === "existing") {
        if (!selectedCollectionId) {
          throw new Error("Choose a bookmark collection or switch to the new collection tab.");
        }

        await onSave({ mode: "existing", collectionId: selectedCollectionId });
        return;
      }

      const normalizedName = collectionName.trim();

      if (!normalizedName) {
        throw new Error("Enter a name for the new bookmark collection.");
      }

      await onSave({
        mode: "new",
        collectionColor: normalizeTimelineBookmarkCollectionColor(collectionColor),
        collectionName: normalizedName,
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to save bookmark.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto overscroll-contain bg-zinc-950/45 px-4 py-6 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 mx-auto my-auto w-full max-w-3xl rounded-4xl border border-zinc-200 bg-[#fffdf9] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Bookmark collection
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
              Choose a collection
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Close
          </button>
        </div>

        <div className="mt-5 inline-flex rounded-full border border-zinc-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setMode("existing")}
            className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition ${
              mode === "existing"
                ? "bg-zinc-950 text-white shadow-sm"
                : "text-zinc-600 hover:text-zinc-950"
            }`}
          >
            Existing
          </button>
          <button
            type="button"
            onClick={() => setMode("new")}
            className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition ${
              mode === "new"
                ? "bg-zinc-950 text-white shadow-sm"
                : "text-zinc-600 hover:text-zinc-950"
            }`}
          >
            Create new
          </button>
        </div>

        {mode === "existing" ? (
          <div className="mt-5 grid gap-3">
            {collections.length > 0 ? (
              collections.map((collection) => (
                <button
                  key={collection.id}
                  type="button"
                  onClick={() => setSelectedCollectionId(collection.id)}
                  className={`flex items-center justify-between gap-3 rounded-3xl border px-4 py-3 text-left transition ${
                    selectedCollectionId === collection.id
                      ? "border-zinc-950 bg-zinc-50"
                      : "border-zinc-200 bg-white hover:border-zinc-300"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className="h-4 w-4 shrink-0 rounded-full border border-zinc-200"
                      style={{ backgroundColor: collection.color }}
                    />
                    <span className="truncate text-sm font-medium text-zinc-950">
                      {collection.name}
                    </span>
                  </span>
                  <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                    Select
                  </span>
                </button>
              ))
            ) : (
              <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
                No bookmark collections yet. Switch to <span className="font-medium">Create new</span>
                to make one.
              </div>
            )}
          </div>
        ) : (
          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,22rem)] lg:items-start">
            <div className="space-y-4">
              <label className="block text-sm font-medium text-zinc-800">
                Collection name
                <input
                  value={collectionName}
                  onChange={(event) => setCollectionName(event.target.value)}
                  className="mt-2 h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-950/10"
                  placeholder="e.g. Character arcs"
                />
              </label>

              <div className="rounded-3xl border border-zinc-200 bg-white p-4 text-sm leading-6 text-zinc-600">
                Pick any color from the wheel. The collection will store the value as a hex color
                and the same glow will follow it through the timeline.
              </div>
            </div>

            <TimelineColorWheelPicker
              value={collectionColor}
              onChange={(nextColor) => setCollectionColor(normalizeTimelineBookmarkCollectionColor(nextColor))}
            />
          </div>
        )}

        {error ? (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? "Saving..." : "Save bookmark"}
          </button>
        </div>
      </div>
    </div>
  );
}
