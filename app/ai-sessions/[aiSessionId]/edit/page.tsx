"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { AiSessionForm } from "@/components/ai-sessions/ai-session-form";
import { PageShell } from "@/components/layout/page-shell";
import { useAiSession } from "@/hooks/use-ai-session";
import { updateAiSessionForProject } from "@/lib/firebase/ai-sessions";
import {
  aiSessionToFormValues,
  type NormalizedAiSessionFormValues,
} from "@/types/ai-session";

export default function EditAiSessionPage() {
  const params = useParams<{ aiSessionId: string }>();
  const router = useRouter();
  const aiSessionId = typeof params.aiSessionId === "string" ? params.aiSessionId : null;
  const { aiSession, loading, error, user, uid, activeProjectId, activeProject } =
    useAiSession(aiSessionId);

  async function handleUpdateAiSession(values: NormalizedAiSessionFormValues) {
    if (!uid || !activeProjectId || !aiSessionId) {
      throw new Error("AI session context is missing.");
    }

    await updateAiSessionForProject(uid, activeProjectId, aiSessionId, values);
    router.push(`/ai-sessions/${aiSessionId}`);
  }

  return (
    <PageShell
      eyebrow="AI Sessions"
      title={aiSession ? `Edit ${aiSession.title}` : "Edit AI session"}
      description="Update the first set of structured AI session fields and write the changes back to the currently active project's nested ai_sessions document."
    >
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
              Active project
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {activeProject
                ? `${activeProject.title} (${activeProject.id})`
                : "No active project selected"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/ai-sessions"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to AI sessions
            </Link>
            {aiSessionId ? (
              <Link
                href={`/ai-sessions/${aiSessionId}`}
                className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                View detail
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to edit AI sessions.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading AI session data...</StateCard>
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
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <AiSessionForm
            initialValues={aiSessionToFormValues(aiSession)}
            submitLabel="Save changes"
            onSubmit={handleUpdateAiSession}
          />
        </section>
      )}
    </PageShell>
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
