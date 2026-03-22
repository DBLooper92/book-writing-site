"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { CultureDetailSection } from "@/components/cultures/culture-detail-section";
import { PageShell } from "@/components/layout/page-shell";
import { useCulture } from "@/hooks/use-culture";

export default function CultureDetailPage() {
  const params = useParams<{ cultureId: string }>();
  const cultureId = typeof params.cultureId === "string" ? params.cultureId : null;
  const { culture, loading, error, user, activeProjectId, activeProject } =
    useCulture(cultureId);

  return (
    <PageShell
      eyebrow="Cultures"
      title={culture?.name ?? "Culture detail"}
      description="Culture records are loaded from the active project's scoped cultures rows so every detail view stays scoped to the current story bible."
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
              Scope: Supabase rows filtered by user_id and project_id for cultures/
              {cultureId ?? "{cultureId}"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/cultures"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to cultures
            </Link>
            {culture ? (
              <Link
                href={`/cultures/${culture.id}/edit`}
                className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                Edit culture
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to view this culture.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading culture details...</StateCard>
      ) : !activeProjectId || !activeProject ? (
        <StateCard tone="neutral">
          No active project selected. Choose one on the{" "}
          <Link href="/projects" className="font-medium underline">
            projects page
          </Link>
          .
        </StateCard>
      ) : error || !culture ? (
        <StateCard tone="error">
          {error ?? "Culture not found in the active project."}
        </StateCard>
      ) : (
        <>
          <CultureDetailSection title="Summary">
            <div className="space-y-3 text-sm leading-6 text-zinc-700">
              <p>{culture.summary || "No summary yet."}</p>
              <p>{culture.description || "No full description yet."}</p>
            </div>
          </CultureDetailSection>

          <CultureDetailSection title="Core details">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Status" value={culture.status} />
              <DetailItem label="Canon level" value={culture.canonLevel} />
              <DetailItem label="Confidence" value={culture.confidence} />
            </div>
          </CultureDetailSection>

          <CultureDetailSection title="Beliefs and practices">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Core values" values={culture.coreValues} />
              <ListBlock label="Traditions" values={culture.traditions} />
            </div>
          </CultureDetailSection>

          <CultureDetailSection title="Links and references">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock
                label="Associated location IDs"
                values={culture.associatedLocationIds}
              />
              <ListBlock label="Language IDs" values={culture.languageIds} />
              <ListBlock label="Religion IDs" values={culture.religionIds} />
              <ListBlock label="Faction IDs" values={culture.factionIds} />
              <ListBlock label="Era IDs" values={culture.eraIds} />
              <ListBlock label="Tags" values={culture.tags} />
            </div>
          </CultureDetailSection>

          <CultureDetailSection title="Public wiki summary">
            <p className="text-sm leading-6 text-zinc-700">
              {culture.publicWikiSummary || "No public wiki summary yet."}
            </p>
          </CultureDetailSection>
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
