"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { LocationDetailSection } from "@/components/locations/location-detail-section";
import { useLocation } from "@/hooks/use-location";

export default function LocationDetailPage() {
  const params = useParams<{ locationId: string }>();
  const locationId = typeof params.locationId === "string" ? params.locationId : null;
  const { location, loading, error, user, activeProjectId, activeProject } =
    useLocation(locationId);

  return (
    <PageShell
      eyebrow="Locations"
      title={location?.name ?? "Location detail"}
      description="Location records are loaded from the active project's nested locations collection so every detail view stays scoped to the current story bible."
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
              Scope: Supabase rows filtered by user_id and project_id for locations/
              {locationId ?? "{locationId}"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/locations"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to locations
            </Link>
            {location ? (
              <Link
                href={`/locations/${location.id}/edit`}
                className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                Edit location
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to view this location.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading location details...</StateCard>
      ) : !activeProjectId || !activeProject ? (
        <StateCard tone="neutral">
          No active project selected. Choose one on the{" "}
          <Link href="/projects" className="font-medium underline">
            projects page
          </Link>
          .
        </StateCard>
      ) : error || !location ? (
        <StateCard tone="error">
          {error ?? "Location not found in the active project."}
        </StateCard>
      ) : (
        <>
          <LocationDetailSection title="Summary">
            <div className="space-y-3 text-sm leading-6 text-zinc-700">
              <p>{location.summary || "No summary yet."}</p>
              <p>{location.description || "No full description yet."}</p>
            </div>
          </LocationDetailSection>

          <LocationDetailSection title="Core details">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Status" value={location.status} />
              <DetailItem label="Location type" value={location.locationType} />
              <DetailItem label="Danger level" value={location.dangerLevel || "Unknown"} />
              <DetailItem label="Parent location ID" value={location.parentLocationId ?? "None"} />
              <DetailItem label="Canon level" value={location.canonLevel} />
              <DetailItem label="Confidence" value={location.confidence} />
            </div>
          </LocationDetailSection>

          <LocationDetailSection title="World and context">
            <div className="grid gap-4 lg:grid-cols-2">
              <TextBlock label="Population notes" value={location.populationNotes} />
              <TextBlock label="Economy" value={location.economy} />
              <ListBlock label="Era IDs" values={location.eraIds} />
              <ListBlock label="Culture IDs" values={location.cultureIds} />
              <ListBlock label="Faction IDs" values={location.factionIds} />
              <ListBlock label="Child location IDs" values={location.childLocationIds} />
            </div>
          </LocationDetailSection>

          <LocationDetailSection title="Physical details">
            <div className="grid gap-4 lg:grid-cols-2">
              <TextBlock label="Climate" value={location.climate} />
              <TextBlock label="Geography" value={location.geography} />
              <TextBlock label="Architecture" value={location.architecture} />
              <ListBlock label="Customs" values={location.customs} />
              <ListBlock label="Notable features" values={location.notableFeatures} />
            </div>
          </LocationDetailSection>

          <LocationDetailSection title="Links and references">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Timeline event IDs" values={location.timelineEventIds} />
              <ListBlock label="Book IDs" values={location.bookIds} />
              <ListBlock label="Character IDs" values={location.characterIds} />
              <ListBlock label="Tags" values={location.tags} />
            </div>
          </LocationDetailSection>

          <LocationDetailSection title="Public wiki summary">
            <p className="text-sm leading-6 text-zinc-700">
              {location.publicWikiSummary || "No public wiki summary yet."}
            </p>
          </LocationDetailSection>
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
      <p className="mt-2 text-sm leading-6 text-zinc-700">{value || "None yet."}</p>
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
