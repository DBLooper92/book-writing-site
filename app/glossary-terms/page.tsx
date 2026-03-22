"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { GlossaryTermCard } from "@/components/glossary-terms/glossary-term-card";
import { PageShell } from "@/components/layout/page-shell";
import { useGlossaryTerms } from "@/hooks/use-glossary-terms";

export default function GlossaryTermsPage() {
  const { glossaryTerms, loading, error, user, activeProjectId, activeProject } =
    useGlossaryTerms();

  return (
    <PageShell
      eyebrow="Glossary Terms"
      title="Glossary index"
      description="Browse, create, and manage glossary term records inside the currently active story-bible project. All records stay scoped through Supabase rows keyed by user_id, project_id, and readable id."
    >
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
              Active project context
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {activeProject
                ? `Viewing glossary terms for ${activeProject.title} (${activeProject.id}).`
                : "Choose an active project to scope glossary data."}
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
              Scope: Supabase rows filtered by user_id and project_id for glossary_terms
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
              href="/glossary-terms/new"
              className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Create glossary term
            </Link>
          </div>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to view glossary terms for your projects.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">
          Loading glossary term records for the active project...
        </StateCard>
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
      ) : glossaryTerms.length === 0 ? (
        <StateCard tone="neutral">
          No glossary terms exist in {activeProject.title} yet.{" "}
          <Link href="/glossary-terms/new" className="font-medium underline">
            Create the first glossary term
          </Link>
          .
        </StateCard>
      ) : (
        <section className="grid gap-4">
          {glossaryTerms.map((glossaryTerm) => (
            <GlossaryTermCard key={glossaryTerm.id} glossaryTerm={glossaryTerm} />
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

