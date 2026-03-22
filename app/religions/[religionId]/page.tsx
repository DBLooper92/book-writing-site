"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { ReligionDetailSection } from "@/components/religions/religion-detail-section";
import { useReligion } from "@/hooks/use-religion";

export default function ReligionDetailPage() {
  const params = useParams<{ religionId: string }>();
  const religionId = typeof params.religionId === "string" ? params.religionId : null;
  const { religion, loading, error, user, activeProjectId, activeProject } =
    useReligion(religionId);

  return (
    <PageShell
      eyebrow="Religions"
      title={religion?.name ?? "Religion detail"}
      description="Religion records are loaded from the active project's nested religions collection so belief-system references stay scoped to the current story bible."
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
              Scope: Supabase rows filtered by user_id and project_id for religions/
              {religionId ?? "{religionId}"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/religions"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to religions
            </Link>
            {religion ? (
              <Link
                href={`/religions/${religion.id}/edit`}
                className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                Edit religion
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to view this religion.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading religion details...</StateCard>
      ) : !activeProjectId || !activeProject ? (
        <StateCard tone="neutral">
          No active project selected. Choose one on the{" "}
          <Link href="/projects" className="font-medium underline">
            projects page
          </Link>
          .
        </StateCard>
      ) : error || !religion ? (
        <StateCard tone="error">
          {error ?? "Religion not found in the active project."}
        </StateCard>
      ) : (
        <>
          <ReligionDetailSection title="Summary">
            <div className="space-y-3 text-sm leading-6 text-zinc-700">
              <p>{religion.summary || "No summary yet."}</p>
              <p>{religion.description || "No full description yet."}</p>
            </div>
          </ReligionDetailSection>

          <ReligionDetailSection title="Core details">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Status" value={formatEnumValue(religion.status)} />
              <DetailItem
                label="Canon level"
                value={formatEnumValue(religion.canonLevel)}
              />
              <DetailItem
                label="Confidence"
                value={formatEnumValue(religion.confidence)}
              />
              <DetailItem
                label="Belief system type"
                value={religion.beliefSystemType || "None"}
              />
              <DetailItem label="Deity or focus" value={religion.deityOrFocus || "None"} />
              <DetailItem label="Slug" value={religion.slug} />
            </div>
          </ReligionDetailSection>

          <ReligionDetailSection title="Practices and references">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Core beliefs" values={religion.coreBeliefs} />
              <ListBlock label="Rituals" values={religion.rituals} />
              <ListBlock label="Holy site IDs" values={religion.holySites} />
              <ListBlock
                label="Associated culture IDs"
                values={religion.associatedCultures}
              />
              <ListBlock
                label="Associated organization IDs"
                values={religion.associatedOrganizations}
              />
              <ListBlock label="Tags" values={religion.tags} />
            </div>
          </ReligionDetailSection>

          <ReligionDetailSection title="Public wiki summary">
            <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-700">
              {religion.publicWikiSummary || "No public wiki summary stored yet."}
            </p>
          </ReligionDetailSection>
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

function formatEnumValue(value: string) {
  if (!value) {
    return "Unknown";
  }

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
