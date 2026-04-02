"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { BrainDumpForm } from "@/components/ai-sessions/brain-dump-form";
import { PageShell } from "@/components/layout/page-shell";
import { useAiCapabilities } from "@/components/providers/ai-capabilities-provider";
import { useActiveProject } from "@/hooks/use-active-project";
import {
  getAiCapabilityDisabledMessage,
  isAiCapabilityEnabled,
} from "@/lib/ai/capabilities";

export default function BrainDumpPage() {
  const router = useRouter();
  const { loading: aiCapabilitiesLoading, settings: aiCapabilities } = useAiCapabilities();
  const { user, activeProjectId, activeProject, loading } = useActiveProject();
  const creativeDisabled =
    !aiCapabilitiesLoading && !isAiCapabilityEnabled(aiCapabilities, "creative");
  const creativeDisabledMessage = getAiCapabilityDisabledMessage("creative");

  return (
    <PageShell
      eyebrow="AI Sessions"
      title="Brain dump to structure"
      description="Paste messy planning text, exploratory prose, or long-form notes and turn it into reviewable AI proposals for characters, timeline events, chapter outlines, and scenes inside the active project."
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
                : "A project must be active before brain dump extraction can continue."}
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
              Output stays as reviewable AI-session proposals until you turn it into real canon by hand.
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
              href="/ai-sessions/new"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Metadata-only session
            </Link>
          </div>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to use brain dump extraction.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading active project context...</StateCard>
      ) : !activeProjectId || !activeProject ? (
        <StateCard tone="neutral">
          No active project selected. Choose one on the{" "}
          <Link href="/projects" className="font-medium underline">
            projects page
          </Link>
          .
        </StateCard>
      ) : (
        <>
          {creativeDisabled ? (
            <StateCard tone="neutral">
              {creativeDisabledMessage} This workflow stays visible here, but the form is locked
              until creative AI is turned back on.
            </StateCard>
          ) : null}

          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <BrainDumpForm
              disabled={creativeDisabled}
              disabledReason={creativeDisabledMessage}
              projectId={activeProjectId}
              onSuccess={(aiSessionId) => router.push(`/ai-sessions/${aiSessionId}`)}
            />
          </section>

          <StateCard tone="neutral">
            Save an OpenAI API key under Profile {">"} API keys before using this route. The first
            pass stores the raw dump, the AI guidance, and the structured extraction result on the
            scoped `ai_sessions` row so you can review it later.
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
