"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { EntityImageGallery } from "@/components/attachments/entity-image-gallery";
import { FactionDetailSection } from "@/components/factions/faction-detail-section";
import { PageShell } from "@/components/layout/page-shell";
import { useFaction } from "@/hooks/use-faction";

export default function FactionDetailPage() {
  const params = useParams<{ factionId: string }>();
  const factionId = typeof params.factionId === "string" ? params.factionId : null;
  const { faction, loading, error, user, activeProjectId, activeProject } =
    useFaction(factionId);

  return (
    <PageShell
      eyebrow="Factions"
      title={faction?.name ?? "Faction detail"}
      description="Faction records are loaded from the active project's scoped factions rows so every detail view stays scoped to the current story bible."
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
              Scope: Supabase rows filtered by user_id and project_id for factions/
              {factionId ?? "{factionId}"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/factions"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to factions
            </Link>
            {faction ? (
              <Link
                href={`/factions/${faction.id}/edit`}
                className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                Edit faction
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to view this faction.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading faction details...</StateCard>
      ) : !activeProjectId || !activeProject ? (
        <StateCard tone="neutral">
          No active project selected. Choose one on the{" "}
          <Link href="/projects" className="font-medium underline">
            projects page
          </Link>
          .
        </StateCard>
      ) : error || !faction ? (
        <StateCard tone="error">
          {error ?? "Faction not found in the active project."}
        </StateCard>
      ) : (
        <>
          <EntityImageGallery
            uid={user.uid}
            projectId={activeProjectId}
            entityType="factions"
            entityId={faction.id}
          />

          <FactionDetailSection title="Summary">
            <div className="space-y-3 text-sm leading-6 text-zinc-700">
              <p>{faction.summary || "No summary yet."}</p>
              <p>{faction.description || "No full description yet."}</p>
            </div>
          </FactionDetailSection>

          <FactionDetailSection title="Core details">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Status" value={faction.status} />
              <DetailItem label="Faction type" value={faction.factionType} />
              <DetailItem label="Founded year" value={formatOptionalNumber(faction.foundedYear)} />
              <DetailItem label="Ended year" value={formatOptionalNumber(faction.endedYear)} />
              <DetailItem label="Government ID" value={faction.governmentId ?? "None"} />
              <DetailItem label="Canon level" value={faction.canonLevel} />
              <DetailItem label="Confidence" value={faction.confidence} />
            </div>
          </FactionDetailSection>

          <FactionDetailSection title="Leadership and bases">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Leader character IDs" values={faction.leaderCharacterIds} />
              <ListBlock label="Base location IDs" values={faction.baseLocationIds} />
            </div>
          </FactionDetailSection>

          <FactionDetailSection title="Goals and resources">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Goals" values={faction.goals} />
              <ListBlock label="Resources" values={faction.resources} />
            </div>
          </FactionDetailSection>

          <FactionDetailSection title="Links and references">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Culture IDs" values={faction.cultureIds} />
              <ListBlock label="Religion IDs" values={faction.religionIds} />
              <ListBlock label="Rivals" values={faction.rivals} />
              <ListBlock label="Allies" values={faction.allies} />
              <ListBlock label="Timeline event IDs" values={faction.timelineEventIds} />
              <ListBlock label="Book IDs" values={faction.bookIds} />
              <ListBlock label="Tags" values={faction.tags} />
            </div>
          </FactionDetailSection>

          <FactionDetailSection title="Public wiki summary">
            <p className="text-sm leading-6 text-zinc-700">
              {faction.publicWikiSummary || "No public wiki summary yet."}
            </p>
          </FactionDetailSection>
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

function formatOptionalNumber(value: number | null) {
  return typeof value === "number" ? String(value) : "Unknown";
}
