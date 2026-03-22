"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { LocationForm } from "@/components/locations/location-form";
import { useLocation } from "@/hooks/use-location";
import { updateLocationForProject } from "@/lib/data/locations";
import {
  locationToFormValues,
  type NormalizedLocationFormValues,
} from "@/types/location";

export default function EditLocationPage() {
  const params = useParams<{ locationId: string }>();
  const router = useRouter();
  const locationId = typeof params.locationId === "string" ? params.locationId : null;
  const { location, loading, error, user, uid, activeProjectId, activeProject } =
    useLocation(locationId);

  async function handleUpdateLocation(values: NormalizedLocationFormValues) {
    if (!uid || !activeProjectId || !locationId) {
      throw new Error("Location context is missing.");
    }

    await updateLocationForProject(uid, activeProjectId, locationId, values);
    router.push(`/locations/${locationId}`);
  }

  return (
    <PageShell
      eyebrow="Locations"
      title={location ? `Edit ${location.name}` : "Edit location"}
      description="Update the first set of structured location fields and write the changes back to the currently active project's nested location document."
    >
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
              Active project
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {activeProject
                ? `${activeProject.title} (${activeProject.id})`
                : "No active project selected"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/locations"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to locations
            </Link>
            {locationId ? (
              <Link
                href={`/locations/${locationId}`}
                className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                View detail
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to edit locations.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading location data...</StateCard>
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
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <LocationForm
            initialValues={locationToFormValues(location)}
            submitLabel="Save changes"
            onSubmit={handleUpdateLocation}
          />
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
