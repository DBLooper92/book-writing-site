"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { EraDetailSection } from "@/components/eras/era-detail-section";
import { PageShell } from "@/components/layout/page-shell";
import { useEra } from "@/hooks/use-era";

export default function EraDetailPage() {
  const params = useParams<{ eraId: string }>();
  const eraId = typeof params.eraId === "string" ? params.eraId : null;
  const { era, loading, error, user, activeProjectId, activeProject } = useEra(eraId);

  return (
    <PageShell
      eyebrow="Eras"
      title={era?.name ?? "Era detail"}
      description="Era records are loaded from the active project's nested eras collection so chronology anchors stay scoped to the current story bible."
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
              Scope: users/{`{uid}`}/projects/{activeProjectId ?? "{projectId}"}/eras/
              {eraId ?? "{eraId}"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/eras"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to eras
            </Link>
            {era ? (
              <Link
                href={`/eras/${era.id}/edit`}
                className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                Edit era
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to view this era.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading era details...</StateCard>
      ) : !activeProjectId || !activeProject ? (
        <StateCard tone="neutral">
          No active project selected. Choose one on the{" "}
          <Link href="/projects" className="font-medium underline">
            projects page
          </Link>
          .
        </StateCard>
      ) : error || !era ? (
        <StateCard tone="error">{error ?? "Era not found in the active project."}</StateCard>
      ) : (
        <>
          <EraDetailSection title="Summary">
            <div className="space-y-3 text-sm leading-6 text-zinc-700">
              <p>{era.summary || "No summary yet."}</p>
              <p>{era.description || "No full description yet."}</p>
            </div>
          </EraDetailSection>

          <EraDetailSection title="Core details">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Status" value={formatEnumValue(era.status)} />
              <DetailItem label="Canon level" value={formatEnumValue(era.canonLevel)} />
              <DetailItem label="Confidence" value={formatEnumValue(era.confidence)} />
              <DetailItem label="Year range" value={formatEraRange(era.startYear, era.endYear)} />
              <DetailItem label="Slug" value={era.slug} />
            </div>
          </EraDetailSection>

          <EraDetailSection title="Defining history">
            <ListBlock label="Defining events" values={era.definingEvents} />
          </EraDetailSection>

          <EraDetailSection title="Links and references">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Key location IDs" values={era.keyLocations} />
              <ListBlock label="Key faction IDs" values={era.keyFactions} />
              <ListBlock label="Dominant theme IDs" values={era.dominantThemes} />
              <ListBlock label="Tags" values={era.tags} />
            </div>
          </EraDetailSection>

          <EraDetailSection title="Public wiki summary">
            <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-700">
              {era.publicWikiSummary || "No public wiki summary stored yet."}
            </p>
          </EraDetailSection>
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

function formatEraRange(startYear: number | null, endYear: number | null) {
  if (typeof startYear === "number" && typeof endYear === "number") {
    return startYear === endYear ? String(startYear) : `${startYear}-${endYear}`;
  }

  if (typeof startYear === "number") {
    return `From ${startYear}`;
  }

  if (typeof endYear === "number") {
    return `Until ${endYear}`;
  }

  return "Undated";
}

function formatEnumValue(value: string) {
  if (!value) {
    return "Unknown";
  }

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
