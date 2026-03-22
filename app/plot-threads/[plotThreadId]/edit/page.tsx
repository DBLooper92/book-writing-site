"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { PlotThreadForm } from "@/components/plot-threads/plot-thread-form";
import { usePlotThread } from "@/hooks/use-plot-thread";
import { updatePlotThreadForProject } from "@/lib/data/plot-threads";
import {
  plotThreadToFormValues,
  type NormalizedPlotThreadFormValues,
} from "@/types/plot-thread";

export default function EditPlotThreadPage() {
  const params = useParams<{ plotThreadId: string }>();
  const router = useRouter();
  const plotThreadId =
    typeof params.plotThreadId === "string" ? params.plotThreadId : null;
  const { plotThread, loading, error, user, uid, activeProjectId, activeProject } =
    usePlotThread(plotThreadId);

  async function handleUpdatePlotThread(values: NormalizedPlotThreadFormValues) {
    if (!uid || !activeProjectId || !plotThreadId) {
      throw new Error("Plot-thread context is missing.");
    }

    await updatePlotThreadForProject(uid, activeProjectId, plotThreadId, values);
    router.push(`/plot-threads/${plotThreadId}`);
  }

  return (
    <PageShell
      eyebrow="Plot Threads"
      title={plotThread ? `Edit ${plotThread.title}` : "Edit plot thread"}
      description="Update the first set of structured plot-thread fields and write the changes back to the currently active project's nested plot-thread document."
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
              href="/plot-threads"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to plot threads
            </Link>
            {plotThreadId ? (
              <Link
                href={`/plot-threads/${plotThreadId}`}
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
          Sign in first to edit plot threads.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading plot-thread data...</StateCard>
      ) : !activeProjectId || !activeProject ? (
        <StateCard tone="neutral">
          No active project selected. Choose one on the{" "}
          <Link href="/projects" className="font-medium underline">
            projects page
          </Link>
          .
        </StateCard>
      ) : error || !plotThread ? (
        <StateCard tone="error">
          {error ?? "Plot thread not found in the active project."}
        </StateCard>
      ) : (
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <PlotThreadForm
            initialValues={plotThreadToFormValues(plotThread)}
            submitLabel="Save changes"
            onSubmit={handleUpdatePlotThread}
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
