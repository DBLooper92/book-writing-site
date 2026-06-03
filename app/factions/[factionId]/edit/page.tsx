"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { FactionForm } from "@/components/factions/faction-form";
import { PageShell } from "@/components/layout/page-shell";
import { useFaction } from "@/hooks/use-faction";
import { updateFactionForProject } from "@/lib/data/factions";
import {
  factionToFormValues,
  type NormalizedFactionFormValues,
} from "@/types/faction";

export default function EditFactionPage() {
  const params = useParams<{ factionId: string }>();
  const router = useRouter();
  const factionId = typeof params.factionId === "string" ? params.factionId : null;
  const { faction, loading, error, user, uid, activeProjectId, activeProject } =
    useFaction(factionId);

  async function handleUpdateFaction(values: NormalizedFactionFormValues) {
    if (!uid || !activeProjectId || !factionId) {
      throw new Error("Faction context is missing.");
    }

    await updateFactionForProject(uid, activeProjectId, factionId, values);
    router.push(`/factions/${factionId}`);
  }

  return (
    <PageShell
      eyebrow="Factions"
      title={faction ? `Edit ${faction.name}` : "Edit faction"}
      description="Update the first set of structured faction fields and write the changes back to the currently active project's scoped faction row."
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
              href="/factions"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to factions
            </Link>
            {factionId ? (
              <Link
                href={`/factions/${factionId}`}
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
          Sign in first to edit factions.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading faction data...</StateCard>
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
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <FactionForm
            initialValues={factionToFormValues(faction)}
            submitLabel="Save changes"
            onSubmit={handleUpdateFaction}
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
