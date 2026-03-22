"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { SpeciesDetailSection } from "@/components/species/species-detail-section";
import { useSpeciesRecord } from "@/hooks/use-species-record";

export default function SpeciesDetailPage() {
  const params = useParams<{ speciesId: string }>();
  const speciesId = typeof params.speciesId === "string" ? params.speciesId : null;
  const { species, loading, error, user, activeProjectId, activeProject } =
    useSpeciesRecord(speciesId);

  return (
    <PageShell
      eyebrow="Species"
      title={species?.name ?? "Species detail"}
      description="Species records are loaded from the active project's nested species collection so every detail view stays scoped to the current story bible."
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
              Scope: Supabase rows filtered by user_id and project_id for species/
              {speciesId ?? "{speciesId}"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/species"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to species
            </Link>
            {species ? (
              <Link
                href={`/species/${species.id}/edit`}
                className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                Edit species
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to view this species entry.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading species details...</StateCard>
      ) : !activeProjectId || !activeProject ? (
        <StateCard tone="neutral">
          No active project selected. Choose one on the{" "}
          <Link href="/projects" className="font-medium underline">
            projects page
          </Link>
          .
        </StateCard>
      ) : error || !species ? (
        <StateCard tone="error">
          {error ?? "Species not found in the active project."}
        </StateCard>
      ) : (
        <>
          <SpeciesDetailSection title="Summary">
            <div className="space-y-3 text-sm leading-6 text-zinc-700">
              <p>{species.summary || "No summary yet."}</p>
              <p>{species.description || "No full description yet."}</p>
            </div>
          </SpeciesDetailSection>

          <SpeciesDetailSection title="Metadata">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <DetailItem label="Status" value={species.status} />
              <DetailItem label="Canon level" value={species.canonLevel} />
              <DetailItem label="Confidence" value={species.confidence} />
              <DetailItem label="Lifespan" value={species.lifespan || "Not set"} />
            </div>
          </SpeciesDetailSection>

          <SpeciesDetailSection title="Origins and biology">
            <div className="grid gap-4 lg:grid-cols-2">
              <TextBlock label="Origin" value={species.origin} />
              <TextBlock label="Appearance" value={species.appearance} />
              <TextBlock label="Biology" value={species.biology} />
              <TextBlock label="Reproduction" value={species.reproduction} />
              <TextBlock label="Diet" value={species.diet} />
              <TextBlock label="Psychology" value={species.psychology} />
              <TextBlock label="Social structure" value={species.socialStructure} />
            </div>
          </SpeciesDetailSection>

          <SpeciesDetailSection title="Capabilities and limits">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Abilities" values={species.abilities} />
              <ListBlock label="Limitations" values={species.limitations} />
              <ListBlock label="Notable subgroups" values={species.notableSubgroups} />
              <ListBlock label="Tags" values={species.tags} />
            </div>
          </SpeciesDetailSection>

          <SpeciesDetailSection title="Public wiki summary">
            <p className="text-sm leading-6 text-zinc-700">
              {species.publicWikiSummary || "No public wiki summary yet."}
            </p>
          </SpeciesDetailSection>
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
      <p className="mt-3 text-sm leading-6 text-zinc-700">{value || "None"}</p>
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
