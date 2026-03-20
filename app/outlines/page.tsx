"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { OutlineCard } from "@/components/outlines/outline-card";
import { useOutlines } from "@/hooks/use-outlines";

export default function OutlinesPage() {
  const { outlines, loading, error, user, activeProjectId, activeProject } = useOutlines();

  return (
    <PageShell
      eyebrow="Outlines"
      title="Outline index"
      description="Browse, create, and manage outline records inside the currently active story-bible project. All outline documents are scoped to the active project under users/{uid}/projects/{projectId}/outlines/{outlineId}."
    >
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
              Active project context
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {activeProject
                ? `Viewing outlines for ${activeProject.title} (${activeProject.id}).`
                : "Choose an active project to scope outline data."}
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
              Scope: users/{`{uid}`}/projects/{activeProjectId ?? "{projectId}"}/outlines
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/projects"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Manage projects
            </Link>
            <Link
              href="/outlines/new"
              className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Create outline
            </Link>
          </div>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to view outlines for your projects.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading outline records for the active project...</StateCard>
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
      ) : outlines.length === 0 ? (
        <StateCard tone="neutral">
          No outlines exist in {activeProject.title} yet.{" "}
          <Link href="/outlines/new" className="font-medium underline">
            Create the first outline
          </Link>
          .
        </StateCard>
      ) : (
        <section className="grid gap-4">
          {outlines.map((outline) => (
            <OutlineCard key={outline.id} outline={outline} />
          ))}
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
