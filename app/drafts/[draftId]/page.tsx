"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { PageShell } from "@/components/layout/page-shell";
import type { DesktopDraftDetail } from "@/types/electron-api";

export default function DraftDetailPage() {
  const params = useParams<{ draftId: string }>();
  const router = useRouter();
  const draftId = String(params?.draftId ?? "");
  const [draft, setDraft] = useState<DesktopDraftDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rawText, setRawText] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDraft() {
      try {
        const nextDraft = await window.bookBible.drafts.get(draftId);

        if (cancelled) {
          return;
        }

        setDraft(nextDraft);
        setRawText(nextDraft?.rawText ?? "");
        setError(nextDraft ? null : "Draft not found.");
      } catch (nextError) {
        if (cancelled) {
          return;
        }

        setError(nextError instanceof Error ? nextError.message : "Unable to load the draft.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDraft();

    return () => {
      cancelled = true;
    };
  }, [draftId]);

  async function runDraftAction(
    action: "apply" | "approve" | "reject" | "save",
    payload?: { rawText: string }
  ) {
    setSaving(true);

    try {
      let nextDraft: DesktopDraftDetail | null = null;

      if (action === "save") {
        nextDraft = await window.bookBible.drafts.save({
          draftId,
          rawText: payload?.rawText ?? rawText,
        });
      } else if (action === "approve") {
        nextDraft = await window.bookBible.drafts.approve(draftId);
      } else if (action === "reject") {
        nextDraft = await window.bookBible.drafts.reject(draftId);
      } else {
        nextDraft = await window.bookBible.drafts.apply(draftId);
      }

      setDraft(nextDraft);
      setRawText(nextDraft.rawText);
      setError(null);

      if (nextDraft.draftId !== draftId) {
        router.replace(`/drafts/${nextDraft.draftId}`);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : `Unable to ${action} the draft.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      eyebrow="Draft Detail"
      title={draft?.summary ?? "Draft"}
      description="Review the proposal bundle, edit the raw JSON when needed, and move it through approve, reject, and apply."
    >
      <section className="flex flex-wrap gap-3">
        <Link
          href="/drafts"
          className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          Back to drafts
        </Link>
        <button
          type="button"
          onClick={() => void runDraftAction("save", { rawText })}
          disabled={saving || loading}
          className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Save JSON
        </button>
        <button
          type="button"
          onClick={() => void runDraftAction("approve")}
          disabled={saving || loading || !draft?.valid || draft?.status === "applied"}
          className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => void runDraftAction("reject")}
          disabled={saving || loading || !draft?.valid || draft?.status === "applied"}
          className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Reject
        </button>
        <button
          type="button"
          onClick={() => void runDraftAction("apply")}
          disabled={saving || loading || !draft?.valid || draft?.status !== "approved"}
          className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Apply To Canon
        </button>
      </section>

      {loading ? (
        <StateCard>Loading draft detail...</StateCard>
      ) : error ? (
        <StateCard tone="error">{error}</StateCard>
      ) : !draft ? (
        <StateCard tone="error">Draft not found.</StateCard>
      ) : (
        <>
          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <DetailItem label="Status" value={draft.status} />
              <DetailItem label="Valid" value={draft.valid ? "Yes" : "No"} />
              <DetailItem label="Source" value={draft.sourceFile ?? draft.fileName} />
              <DetailItem label="Changes" value={String(draft.proposedChangeCount)} />
            </div>

            {draft.errors.length > 0 ? (
              <ul className="mt-4 space-y-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {draft.errors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-950">Raw proposal JSON</h2>
            <textarea
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              spellCheck={false}
              className="mt-4 min-h-[32rem] w-full rounded-3xl border border-zinc-200 bg-zinc-50 p-4 font-mono text-sm leading-6 text-zinc-900 outline-none transition focus:border-zinc-400"
            />
          </section>
        </>
      )}
    </PageShell>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-zinc-900">{value}</p>
    </div>
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
