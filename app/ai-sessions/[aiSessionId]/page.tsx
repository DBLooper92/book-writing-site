"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { AiSessionDetailSection } from "@/components/ai-sessions/ai-session-detail-section";
import { PageShell } from "@/components/layout/page-shell";
import { useAiSession } from "@/hooks/use-ai-session";

export default function AiSessionDetailPage() {
  const params = useParams<{ aiSessionId: string }>();
  const aiSessionId = typeof params.aiSessionId === "string" ? params.aiSessionId : null;
  const { aiSession, loading, error, user, activeProjectId, activeProject } =
    useAiSession(aiSessionId);

  return (
    <PageShell
      eyebrow="AI Sessions"
      title={aiSession?.title ?? "AI session detail"}
      description="AI session records are loaded from the active project's nested ai_sessions collection so each detail view stays scoped to the current story bible."
    >
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
              Active project
            </p>
            <p className="mt-2 text-sm text-zinc-700">
              {activeProject
                ? `${activeProject.title} (${activeProject.id})`
                : "No active project selected"}
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
              Scope: Supabase rows filtered by user_id and project_id for ai_sessions/
              {aiSessionId ?? "{sessionId}"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/ai-sessions"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to AI sessions
            </Link>
            {aiSession ? (
              <Link
                href={`/ai-sessions/${aiSession.id}/edit`}
                className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                Edit AI session
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to view this AI session.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading AI session details...</StateCard>
      ) : !activeProjectId || !activeProject ? (
        <StateCard tone="neutral">
          No active project selected. Choose one on the{" "}
          <Link href="/projects" className="font-medium underline">
            projects page
          </Link>
          .
        </StateCard>
      ) : error || !aiSession ? (
        <StateCard tone="error">
          {error ?? "AI session not found in the active project."}
        </StateCard>
      ) : (
        <>
          <AiSessionDetailSection title="Summary">
            <div className="space-y-3 text-sm leading-6 text-zinc-700">
              <p>{aiSession.summary || "No summary yet."}</p>
              <p>{aiSession.description || "No full description yet."}</p>
            </div>
          </AiSessionDetailSection>

          <AiSessionDetailSection title="Session metadata">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <DetailItem label="Status" value={formatEnumLabel(aiSession.status)} />
              <DetailItem label="Session type" value={formatEnumLabel(aiSession.sessionType)} />
              <DetailItem label="Provider" value={aiSession.provider || "None"} />
              <DetailItem label="Model" value={aiSession.model || "None"} />
              <DetailItem label="Messages count" value={String(aiSession.messagesCount ?? "None")} />
              <DetailItem label="Canon level" value={aiSession.canonLevel} />
              <DetailItem label="Confidence" value={aiSession.confidence} />
            </div>
            <div className="mt-4">
              <TextBlock label="Purpose" value={aiSession.purpose} />
            </div>
          </AiSessionDetailSection>

          <AiSessionDetailSection title="Prompt and output">
            <div className="grid gap-6 lg:grid-cols-2">
              <TextBlock label="Prompt excerpt" value={aiSession.promptExcerpt} />
              <TextBlock label="Output summary" value={aiSession.outputSummary} />
            </div>
          </AiSessionDetailSection>

          <AiSessionDetailSection title="Linked records">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Linked entity types" values={aiSession.linkedEntityTypes} />
              <ListBlock label="Linked entity IDs" values={aiSession.linkedEntityIds} />
              <ListBlock label="Tags" values={aiSession.tags} />
            </div>
          </AiSessionDetailSection>
        </>
      )}
    </PageShell>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 wrap-break-word text-sm font-medium text-zinc-900">{value}</p>
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-700">
        {value || "None yet."}
      </p>
    </div>
  );
}

function ListBlock({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.length > 0 ? (
          values.map((value) => (
            <span
              key={`${label}-${value}`}
              className="rounded-full bg-white px-3 py-1 text-sm text-zinc-700 ring-1 ring-zinc-200"
            >
              {value}
            </span>
          ))
        ) : (
          <span className="text-sm text-zinc-500">None</span>
        )}
      </div>
    </div>
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

function formatEnumLabel(value: string) {
  return value.replace(/_/g, " ");
}
