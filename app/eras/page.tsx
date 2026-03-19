"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { EraCard } from "@/components/eras/era-card";
import { PageShell } from "@/components/layout/page-shell";
import { useEras } from "@/hooks/use-eras";

export default function ErasPage() {
  const { eras, loading, error, user, activeProjectId, activeProject } = useEras();

  return (
    <PageShell
      eyebrow="Eras"
      title="Era index"
      description="Browse, create, and manage era records inside the currently active story-bible project. All era documents are scoped to the active project under users/{uid}/projects/{projectId}/eras/{eraId}."
    >
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
              Active project context
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {activeProject
                ? `Viewing eras for ${activeProject.title} (${activeProject.id}).`
                : "Choose an active project to scope era data."}
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
              Scope: users/{`{uid}`}/projects/{activeProjectId ?? "{projectId}"}/eras
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
              href="/eras/new"
              className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Create era
            </Link>
          </div>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to view eras for your projects.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading era records for the active project...</StateCard>
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
      ) : eras.length === 0 ? (
        <StateCard tone="neutral">
          No eras exist in {activeProject.title} yet.{" "}
          <Link href="/eras/new" className="font-medium underline">
            Create the first era
          </Link>
          .
        </StateCard>
      ) : (
        <section className="grid gap-4">
          {eras.map((era) => (
            <EraCard key={era.id} era={era} />
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
