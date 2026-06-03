"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import type { DesktopDraftListItem } from "@/types/electron-api";

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<DesktopDraftListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadDrafts() {
      try {
        const nextDrafts = await window.bookBible.drafts.list();

        if (cancelled) {
          return;
        }

        setDrafts(nextDrafts);
        setError(null);
      } catch (nextError) {
        if (cancelled) {
          return;
        }

        setError(nextError instanceof Error ? nextError.message : "Unable to load drafts.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDrafts();
    const unsubscribe = window.bookBible.drafts.subscribe(() => {
      void loadDrafts();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return (
    <PageShell
      eyebrow="Drafts"
      title="Review Proposal Bundles"
      description="The desktop app reads reviewable JSON bundles from the local proposals folders and applies approved changes into SQLite."
    >
      {loading ? (
        <StateCard>Loading local drafts...</StateCard>
      ) : error ? (
        <StateCard tone="error">{error}</StateCard>
      ) : drafts.length === 0 ? (
        <StateCard>No proposal files are available yet.</StateCard>
      ) : (
        <section className="grid gap-4">
          {drafts.map((draft) => (
            <Link
              key={draft.draftId}
              href={`/drafts/${draft.draftId}`}
              className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
                    {draft.summary}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    {draft.sourceFile ?? draft.fileName}
                  </p>
                </div>
                <span className={getStatusClassName(draft.status, draft.valid)}>
                  {draft.valid ? draft.status : "invalid"}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-xs uppercase tracking-[0.18em] text-zinc-500">
                <span>{draft.proposedChangeCount} changes</span>
                <span>{draft.createdAt ? new Date(draft.createdAt).toLocaleString() : "Unknown time"}</span>
              </div>

              {draft.errors.length > 0 ? (
                <ul className="mt-4 space-y-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {draft.errors.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              ) : null}
            </Link>
          ))}
        </section>
      )}
    </PageShell>
  );
}

function StateCard({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "error";
}) {
  return (
    <section
      className={`rounded-3xl border p-6 text-sm leading-6 ${
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-zinc-300 bg-zinc-50 text-zinc-600"
      }`}
    >
      {children}
    </section>
  );
}

function getStatusClassName(status: string, valid: boolean) {
  if (!valid) {
    return "rounded-full bg-red-100 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-red-700";
  }

  if (status === "approved") {
    return "rounded-full bg-amber-100 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-amber-800";
  }

  if (status === "applied") {
    return "rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-800";
  }

  if (status === "rejected") {
    return "rounded-full bg-zinc-200 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-700";
  }

  return "rounded-full bg-zinc-950 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white";
}
