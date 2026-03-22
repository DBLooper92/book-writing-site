"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { EraForm } from "@/components/eras/era-form";
import { PageShell } from "@/components/layout/page-shell";
import { useEra } from "@/hooks/use-era";
import { updateEraForProject } from "@/lib/data/eras";
import { eraToFormValues, type NormalizedEraFormValues } from "@/types/era";

export default function EditEraPage() {
  const params = useParams<{ eraId: string }>();
  const router = useRouter();
  const eraId = typeof params.eraId === "string" ? params.eraId : null;
  const { era, loading, error, user, uid, activeProjectId, activeProject } = useEra(eraId);

  async function handleUpdateEra(values: NormalizedEraFormValues) {
    if (!uid || !activeProjectId || !eraId) {
      throw new Error("Era context is missing.");
    }

    await updateEraForProject(uid, activeProjectId, eraId, values);
    router.push(`/eras/${eraId}`);
  }

  return (
    <PageShell
      eyebrow="Eras"
      title={era ? `Edit ${era.name}` : "Edit era"}
      description="Update the first set of structured era fields and write the changes back to the currently active project's nested era document."
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
              href="/eras"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to eras
            </Link>
            {eraId ? (
              <Link
                href={`/eras/${eraId}`}
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
          Sign in first to edit eras.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading era data...</StateCard>
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
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <EraForm
            initialValues={eraToFormValues(era)}
            submitLabel="Save changes"
            onSubmit={handleUpdateEra}
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
