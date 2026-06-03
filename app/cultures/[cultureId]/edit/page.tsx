"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { CultureForm } from "@/components/cultures/culture-form";
import { PageShell } from "@/components/layout/page-shell";
import { useCulture } from "@/hooks/use-culture";
import { updateCultureForProject } from "@/lib/data/cultures";
import {
  cultureToFormValues,
  type NormalizedCultureFormValues,
} from "@/types/culture";

export default function EditCulturePage() {
  const params = useParams<{ cultureId: string }>();
  const router = useRouter();
  const cultureId = typeof params.cultureId === "string" ? params.cultureId : null;
  const { culture, loading, error, user, uid, activeProjectId, activeProject } =
    useCulture(cultureId);

  async function handleUpdateCulture(values: NormalizedCultureFormValues) {
    if (!uid || !activeProjectId || !cultureId) {
      throw new Error("Culture context is missing.");
    }

    await updateCultureForProject(uid, activeProjectId, cultureId, values);
    router.push(`/cultures/${cultureId}`);
  }

  return (
    <PageShell
      eyebrow="Cultures"
      title={culture ? `Edit ${culture.name}` : "Edit culture"}
      description="Update the first set of structured culture fields and write the changes back to the currently active project's scoped culture row."
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
              href="/cultures"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to cultures
            </Link>
            {cultureId ? (
              <Link
                href={`/cultures/${cultureId}`}
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
          Sign in first to edit cultures.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading culture data...</StateCard>
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
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <CultureForm
            initialValues={cultureToFormValues(culture)}
            submitLabel="Save changes"
            onSubmit={handleUpdateCulture}
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
