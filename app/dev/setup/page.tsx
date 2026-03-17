"use client";

import Link from "next/link";
import { useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { useAuthUser } from "@/hooks/use-auth-user";
import {
  initializeStoryBibleDevData,
  STORY_BIBLE_STRUCTURE_PATHS,
  type StoryBibleInitSummary,
} from "@/lib/firebase/dev-init";

type InitState =
  | { tone: "neutral"; text: string; summary: null }
  | { tone: "success"; text: string; summary: StoryBibleInitSummary }
  | { tone: "error"; text: string; summary: null };

const initialState: InitState = {
  tone: "neutral",
  text: "No initialization run yet.",
  summary: null,
};

export default function DevSetupPage() {
  const { user, uid, loading } = useAuthUser();
  const [submitting, setSubmitting] = useState(false);
  const [initState, setInitState] = useState<InitState>(initialState);

  async function handleInitialize() {
    if (!user) {
      setInitState({
        tone: "error",
        text: "Sign in first. The initializer writes data under users/{uid}.",
        summary: null,
      });
      return;
    }

    setSubmitting(true);
    setInitState({
      tone: "neutral",
      text: "Initializing Firestore story-bible data...",
      summary: null,
    });

    try {
      const summary = await initializeStoryBibleDevData({
        uid: user.uid,
        email: user.email ?? null,
        displayName: user.displayName ?? null,
      });

      setInitState({
        tone: "success",
        text: `Initialization finished. Created ${summary.createdCount} path(s), updated ${summary.updatedCount}, skipped ${summary.skippedCount}.`,
        summary,
      });
    } catch (error) {
      setInitState({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unknown error while initializing Firestore data.",
        summary: null,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell
      eyebrow="Developer Setup"
      title="Initialize story-bible Firestore data"
      description="This page seeds a deterministic user document, a default project, and one starter document in each planned story-bible subcollection for the currently authenticated user. It is safe to rerun: existing seed docs are skipped, while the user and project documents are merged and refreshed."
    >
      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
            Auth status
          </h2>
          <div className="mt-4 space-y-3">
            <StatusRow label="Auth loading" value={loading ? "Yes" : "No"} />
            <StatusRow label="Signed in" value={user ? "Yes" : "No"} />
            <StatusRow label="UID" value={uid ?? "Not signed in"} />
            <StatusRow label="Email" value={user?.email ?? "Not available"} />
          </div>

          {!user ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              The initializer requires an authenticated user because it writes
              under <code>users/{`{uid}`}</code>. Sign in on the auth page, then
              rerun setup.
              <div className="mt-4">
                <Link
                  href="/auth"
                  className="inline-flex h-10 items-center justify-center rounded-full border border-amber-300 px-4 font-medium text-amber-900 transition hover:bg-amber-100"
                >
                  Go to auth
                </Link>
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
            Initializer action
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Running this action creates or updates:
            <br />
            <code>users/{`{uid}`}</code>
            <br />
            <code>users/{`{uid}`}/projects/default-story-bible</code>
            <br />
            and one starter document in each planned story-bible subcollection.
          </p>

          <button
            type="button"
            onClick={handleInitialize}
            disabled={loading || !user || submitting}
            className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {submitting ? "Initializing..." : "Initialize My Story Bible Data"}
          </button>

          <div
            className={`mt-4 rounded-2xl px-4 py-3 text-sm leading-6 ${
              initState.tone === "success"
                ? "bg-emerald-50 text-emerald-800"
                : initState.tone === "error"
                  ? "bg-red-50 text-red-800"
                  : "bg-zinc-100 text-zinc-700"
            }`}
          >
            {initState.text}
          </div>

          {initState.summary ? (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <MiniStat label="Created" value={String(initState.summary.createdCount)} />
              <MiniStat label="Updated" value={String(initState.summary.updatedCount)} />
              <MiniStat label="Skipped" value={String(initState.summary.skippedCount)} />
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
            Structure preview
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            The initializer creates visible documents so every planned collection can
            be inspected in Firebase immediately.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-2xl bg-zinc-950 p-4 text-xs leading-6 text-zinc-100">
            {STORY_BIBLE_STRUCTURE_PATHS.join("\n")}
          </pre>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
            Latest result
          </h2>
          {initState.summary ? (
            <div className="mt-4 space-y-4 text-sm leading-6 text-zinc-600">
              <SummaryBlock label="Created paths" paths={initState.summary.createdPaths} />
              <SummaryBlock label="Updated paths" paths={initState.summary.updatedPaths} />
              <SummaryBlock label="Skipped paths" paths={initState.summary.skippedPaths} />
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-zinc-600">
              Run the initializer to see the exact Firestore paths that were
              created, updated, or skipped.
            </p>
          )}
        </div>
      </section>
    </PageShell>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 break-all text-sm font-medium text-zinc-900">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
        {value}
      </p>
    </div>
  );
}

function SummaryBlock({ label, paths }: { label: string; paths: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-950">{label}</h3>
      <pre className="mt-2 overflow-x-auto rounded-2xl bg-zinc-100 p-4 text-xs text-zinc-700">
        {paths.length ? paths.join("\n") : "None"}
      </pre>
    </div>
  );
}
