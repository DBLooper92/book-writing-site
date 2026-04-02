"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { ManuscriptImportForm } from "@/components/ai-sessions/manuscript-import-form";
import { PageShell } from "@/components/layout/page-shell";
import { useActiveProject } from "@/hooks/use-active-project";

export default function ManuscriptImportPage() {
  const router = useRouter();
  const { user, uid, activeProjectId, activeProject, loading } = useActiveProject();

  return (
    <PageShell
      eyebrow="AI Sessions"
      title="Manuscript import to slices"
      description="Upload one existing book or a multi-book series, break it into reviewable chunks, and turn the extracted proposals into canon only after explicit review."
    >
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
              Active project
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {activeProject
                ? `${activeProject.title} (${activeProject.id})`
                : "A project must be active before manuscript import can continue."}
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
              Uploaded source files stay private and linked to the AI session until you explicitly
              apply reviewed proposals.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/ai-sessions"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to AI sessions
            </Link>
            <Link
              href="/ai-sessions/brain-dump"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Brain dump
            </Link>
          </div>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to use manuscript import.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading active project context...</StateCard>
      ) : !uid || !activeProjectId || !activeProject ? (
        <StateCard tone="neutral">
          No active project selected. Choose one on the{" "}
          <Link href="/projects" className="font-medium underline">
            projects page
          </Link>
          .
        </StateCard>
      ) : (
        <>
          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <ManuscriptImportForm
              uid={uid}
              projectId={activeProjectId}
              onSuccess={(aiSessionId) => router.push(`/ai-sessions/${aiSessionId}`)}
            />
          </section>

          <StateCard tone="neutral">
            Save an OpenAI API key under Profile {">"} API keys before processing uploaded chunks.
            Creating the import session and parsing files does not write canon rows by itself.
          </StateCard>
        </>
      )}
    </PageShell>
  );
}

function StateCard({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "neutral" | "warning";
}) {
  const className =
    tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-zinc-300 bg-zinc-50 text-zinc-600";

  return (
    <section className={`rounded-3xl border p-6 text-sm leading-6 ${className}`}>
      {children}
    </section>
  );
}
