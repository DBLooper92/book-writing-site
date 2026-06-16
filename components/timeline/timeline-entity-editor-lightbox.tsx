"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  TIMELINE_ENTITY_EDITOR_CONFIG,
  type TimelineEntitySliceType,
} from "@/lib/timeline/entity-editor";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

const ENTITY_TABLE_NAMES: Record<TimelineEntitySliceType, string> = {
  attachment: "attachments",
  book: "books",
  chapter: "chapters",
  character: "characters",
  culture: "cultures",
  era: "eras",
  faction: "factions",
  glossaryTerm: "glossary_terms",
  government: "governments",
  item: "items",
  language: "languages",
  location: "locations",
  note: "notes",
  organization: "organizations",
  outline: "outlines",
  plotThread: "plot_threads",
  relationship: "relationships",
  religion: "religions",
  retcon: "retcons",
  scene: "scenes",
  species: "species",
  technology: "technologies",
  theme: "themes",
};

type TimelineEntityEditorLightboxProps = {
  activeProjectId: string | null;
  onClose: () => void;
  onSaved?: (entityId: string) => Promise<void> | void;
  sliceType: TimelineEntitySliceType;
  uid: string | null;
};

export function TimelineEntityEditorLightbox({
  activeProjectId,
  onClose,
  onSaved,
  sliceType,
  uid,
}: TimelineEntityEditorLightboxProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<Array<Record<string, unknown>>>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const config = TIMELINE_ENTITY_EDITOR_CONFIG[sliceType];
  const FormComponent = config.formComponent;
  const initialValues = useMemo(() => config.createInitialValues(), [config]);
  const tableName = ENTITY_TABLE_NAMES[sliceType];
  useScrollLock(true);

  useEffect(() => {
    let cancelled = false;

    if (!activeProjectId || !uid) {
      setRecords([]);
      setRecordsError(null);
      setRecordsLoading(false);
      return;
    }

    setRecordsLoading(true);
    setRecordsError(null);

    void getSupabaseBrowserClient()
      .from(tableName as never)
      .select("*")
      .eq("user_id", uid)
      .eq("project_id", activeProjectId)
      .order("updated_at", { ascending: false })
      .then(({ data, error: nextError }) => {
        if (cancelled) {
          return;
        }

        if (nextError) {
          setRecords([]);
          setRecordsError(nextError.message);
          setRecordsLoading(false);
          return;
        }

        setRecords((data ?? []) as Array<Record<string, unknown>>);
        setRecordsLoading(false);
      })
      .catch((nextError: unknown) => {
        if (cancelled) {
          return;
        }

        setRecords([]);
        setRecordsError(nextError instanceof Error ? nextError.message : `Unable to load ${config.indexLabel.toLowerCase()}.`);
        setRecordsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeProjectId, config.indexLabel, sliceType, tableName, uid]);

  async function handleSubmit(values: unknown) {
    if (!uid || !activeProjectId) {
      setError("Select an active project before editing entities.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const entityId = await config.createEntity(uid, activeProjectId, values);

      if (onSaved) {
        await onSaved(entityId);
      }

      onClose();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : `Unable to save this ${config.title.toLowerCase()}.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[68] overflow-y-auto overscroll-contain bg-zinc-950/45 px-4 py-6 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 mx-auto my-auto flex w-full max-w-5xl flex-col overflow-hidden rounded-4xl border border-zinc-200 bg-[#fffdf9] shadow-2xl">
        <div className="border-b border-zinc-200 bg-white px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Entity editor
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
                {config.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Edit or create {config.title.toLowerCase()} records without leaving the timeline.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={config.indexRoute}
                className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                View all {config.indexLabel}
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6">
          {error ? (
            <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
              {error}
            </div>
          ) : null}

          {!uid || !activeProjectId ? (
            <div className="rounded-3xl border border-zinc-300 bg-zinc-50 px-5 py-4 text-sm leading-6 text-zinc-600">
              Select an active project before opening the entity editor.
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
              <aside className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Existing records
                    </p>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">
                      Edit an existing {config.title.toLowerCase()} or open its index page.
                    </p>
                  </div>
                  <Link
                    href={`${config.indexRoute}/new`}
                    className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 px-3 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
                  >
                    New
                  </Link>
                </div>

                <div className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto overscroll-contain pr-1">
                  {recordsLoading ? (
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                      Loading records...
                    </div>
                  ) : recordsError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                      {recordsError}
                    </div>
                  ) : records.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm leading-6 text-zinc-600">
                      No {config.indexLabel.toLowerCase()} exist yet. Use the form on the right to add
                      the first one.
                    </div>
                  ) : (
                    records.map((record) => {
                      const recordId = typeof record.id === "string" ? record.id : null;
                      const recordLabel = getEntityRecordLabel(record);
                      const recordSummary = getEntityRecordSummary(record);

                      return (
                        <div
                          key={recordId ?? recordLabel}
                          className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-zinc-950">
                                {recordLabel}
                              </p>
                              <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                                {recordId ?? "Unknown id"}
                              </p>
                              {recordSummary ? (
                                <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-600">
                                  {recordSummary}
                                </p>
                              ) : null}
                            </div>
                            {recordId ? (
                              <Link
                                href={`${config.indexRoute}/${recordId}/edit`}
                                className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
                              >
                                Edit
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </aside>

              <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Create new record
                    </p>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">
                      Add a new {config.title.toLowerCase()} without leaving the timeline.
                    </p>
                  </div>
                  <Link
                    href={config.indexRoute}
                    className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 px-3 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
                  >
                    View all {config.indexLabel}
                  </Link>
                </div>

                <FormComponent
                  initialValues={initialValues as never}
                  submitLabel={submitting ? "Saving..." : `Create ${config.title}`}
                  onSubmit={handleSubmit}
                />
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getEntityRecordLabel(record: Record<string, unknown>) {
  const candidates = ["title", "name", "label", "slug", "id"] as const;

  for (const key of candidates) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return "Untitled record";
}

function getEntityRecordSummary(record: Record<string, unknown>) {
  const candidates = ["summary", "description", "publicWikiSummary", "dynamicStatus"] as const;

  for (const key of candidates) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}
