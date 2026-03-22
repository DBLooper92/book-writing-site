"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { SpeciesForm } from "@/components/species/species-form";
import { useSpeciesRecord } from "@/hooks/use-species-record";
import { updateSpeciesForProject } from "@/lib/data/species";
import {
  speciesToFormValues,
  type NormalizedSpeciesFormValues,
} from "@/types/species";

export default function EditSpeciesPage() {
  const params = useParams<{ speciesId: string }>();
  const router = useRouter();
  const speciesId = typeof params.speciesId === "string" ? params.speciesId : null;
  const { species, loading, error, user, uid, activeProjectId, activeProject } =
    useSpeciesRecord(speciesId);

  async function handleUpdateSpecies(values: NormalizedSpeciesFormValues) {
    if (!uid || !activeProjectId || !speciesId) {
      throw new Error("Species context is missing.");
    }

    await updateSpeciesForProject(uid, activeProjectId, speciesId, values);
    router.push(`/species/${speciesId}`);
  }

  return (
    <PageShell
      eyebrow="Species"
      title={species ? `Edit ${species.name}` : "Edit species"}
      description="Update the first set of structured species fields and write the changes back to the currently active project's nested species document."
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
              href="/species"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to species
            </Link>
            {speciesId ? (
              <Link
                href={`/species/${speciesId}`}
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
          Sign in first to edit species entries.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading species data...</StateCard>
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
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <SpeciesForm
            initialValues={speciesToFormValues(species)}
            submitLabel="Save changes"
            onSubmit={handleUpdateSpecies}
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
