"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { ReligionCard } from "@/components/religions/religion-card";
import { useReligions } from "@/hooks/use-religions";

export default function ReligionsPage() {
  const { religions, loading, error, user, activeProjectId, activeProject } =
    useReligions();

  return (
    <PageShell
      eyebrow="Religions"
      title="Religion index"
      description="Browse, create, and manage religion records inside the currently active story-bible project. All records stay scoped through Supabase rows keyed by user_id, project_id, and readable id."
    >
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
              Active project context
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {activeProject
                ? `Viewing religions for ${activeProject.title} (${activeProject.id}).`
                : "Choose an active project to scope religion data."}
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
              Scope: Supabase rows filtered by user_id and project_id for religions
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
              href="/religions/new"
              className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Create religion
            </Link>
          </div>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to view religions for your projects.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading religion records for the active project...</StateCard>
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
      ) : religions.length === 0 ? (
        <StateCard tone="neutral">
          No religions exist in {activeProject.title} yet.{" "}
          <Link href="/religions/new" className="font-medium underline">
            Create the first religion
          </Link>
          .
        </StateCard>
      ) : (
        <section className="grid gap-4">
          {religions.map((religion) => (
            <ReligionCard key={religion.id} religion={religion} />
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

