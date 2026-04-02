"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { AiSessionCard } from "@/components/ai-sessions/ai-session-card";
import { PageShell } from "@/components/layout/page-shell";
import { useAiCapabilities } from "@/components/providers/ai-capabilities-provider";
import { useAiSessions } from "@/hooks/use-ai-sessions";
import {
  getAiCapabilityDisabledMessage,
  isAiCapabilityEnabled,
} from "@/lib/ai/capabilities";

export default function AiSessionsPage() {
  const { loading: aiCapabilitiesLoading, settings: aiCapabilities } = useAiCapabilities();
  const { aiSessions, loading, error, user, activeProjectId, activeProject } =
    useAiSessions();
  const creativeDisabled =
    !aiCapabilitiesLoading && !isAiCapabilityEnabled(aiCapabilities, "creative");
  const organizationalDisabled =
    !aiCapabilitiesLoading && !isAiCapabilityEnabled(aiCapabilities, "organizational");

  return (
    <PageShell
      eyebrow="AI Sessions"
      title="AI sessions workspace"
      description="Browse, create, and manage tracked AI work inside the currently active story-bible project. All records stay scoped through Supabase rows keyed by user_id, project_id, and readable id."
    >
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
              Active project context
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {activeProject
                ? `Viewing AI sessions for ${activeProject.title} (${activeProject.id}).`
                : "Choose an active project to scope AI session data."}
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
              Scope: Supabase rows filtered by user_id and project_id for ai_sessions
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <FeatureActionButton
              disabled={creativeDisabled}
              disabledMessage={getAiCapabilityDisabledMessage("creative")}
              href="/ai-sessions/brain-dump"
              label="Brain dump"
              tone="outline"
            />
            <FeatureActionButton
              disabled={organizationalDisabled}
              disabledMessage={getAiCapabilityDisabledMessage("organizational")}
              href="/ai-sessions/manuscript-import"
              label="Manuscript import"
              tone="outline"
            />
            <Link
              href="/projects"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Manage projects
            </Link>
            <Link
              href="/ai-sessions/new"
              className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Create AI session
            </Link>
          </div>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to view AI sessions for your projects.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading AI session records for the active project...</StateCard>
      ) : !activeProjectId || !activeProject ? (
        <StateCard tone="neutral">
          No active project selected. Choose one on the{" "}
          <Link href="/projects" className="font-medium underline">
            projects page
          </Link>
          .
        </StateCard>
      ) : error ? (
        <StateCard tone="error">{error}</StateCard>
      ) : aiSessions.length === 0 ? (
        <StateCard tone="neutral">
          No AI sessions exist in {activeProject.title} yet.{" "}
          <FeatureInlineAction
            disabled={creativeDisabled}
            disabledMessage={getAiCapabilityDisabledMessage("creative")}
            href="/ai-sessions/brain-dump"
            label="Start with a brain dump"
          />{" "}
          or{" "}
          <FeatureInlineAction
            disabled={organizationalDisabled}
            disabledMessage={getAiCapabilityDisabledMessage("organizational")}
            href="/ai-sessions/manuscript-import"
            label="import an existing manuscript"
          />{" "}
          or{" "}
          <Link href="/ai-sessions/new" className="font-medium underline">
            create the first AI session
          </Link>
          .
        </StateCard>
      ) : (
        <section className="grid gap-4">
          {aiSessions.map((aiSession) => (
            <AiSessionCard key={aiSession.id} aiSession={aiSession} />
          ))}
        </section>
      )}
    </PageShell>
  );
}

function FeatureActionButton({
  disabled,
  disabledMessage,
  href,
  label,
  tone,
}: {
  disabled: boolean;
  disabledMessage: string;
  href: string;
  label: string;
  tone: "outline" | "solid";
}) {
  const className =
    tone === "solid"
      ? "inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
      : "inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50";

  if (disabled) {
    return (
      <span
        className="inline-flex h-11 cursor-not-allowed items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 px-4 text-sm font-medium text-zinc-400"
        title={disabledMessage}
      >
        {label}
      </span>
    );
  }

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

function FeatureInlineAction({
  disabled,
  disabledMessage,
  href,
  label,
}: {
  disabled: boolean;
  disabledMessage: string;
  href: string;
  label: string;
}) {
  if (disabled) {
    return (
      <span className="font-medium text-zinc-400" title={disabledMessage}>
        {label}
      </span>
    );
  }

  return (
    <Link href={href} className="font-medium underline">
      {label}
    </Link>
  );
}

function StateCard({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "neutral" | "warning" | "error";
}) {
  const className =
    tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : tone === "error"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-zinc-300 bg-zinc-50 text-zinc-600";

  return (
    <section className={`rounded-3xl border p-6 text-sm leading-6 ${className}`}>
      {children}
    </section>
  );
}

