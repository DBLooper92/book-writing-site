"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { TechnologyForm } from "@/components/technologies/technology-form";
import { useTechnology } from "@/hooks/use-technology";
import { updateTechnologyForProject } from "@/lib/firebase/technologies";
import {
  technologyToFormValues,
  type NormalizedTechnologyFormValues,
} from "@/types/technology";

export default function EditTechnologyPage() {
  const params = useParams<{ technologyId: string }>();
  const router = useRouter();
  const technologyId = typeof params.technologyId === "string" ? params.technologyId : null;
  const { technology, loading, error, user, uid, activeProjectId, activeProject } =
    useTechnology(technologyId);

  async function handleUpdateTechnology(values: NormalizedTechnologyFormValues) {
    if (!uid || !activeProjectId || !technologyId) {
      throw new Error("Technology context is missing.");
    }

    await updateTechnologyForProject(uid, activeProjectId, technologyId, values);
    router.push(`/technologies/${technologyId}`);
  }

  return (
    <PageShell
      eyebrow="Technologies"
      title={technology ? `Edit ${technology.name}` : "Edit technology"}
      description="Update the first set of structured technology fields and write the changes back to the currently active project's nested technology document."
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
              href="/technologies"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to technologies
            </Link>
            {technologyId ? (
              <Link
                href={`/technologies/${technologyId}`}
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
          Sign in first to edit technologies.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading technology data...</StateCard>
      ) : !activeProjectId || !activeProject ? (
        <StateCard tone="neutral">
          No active project selected. Choose one on the{" "}
          <Link href="/projects" className="font-medium underline">
            projects page
          </Link>
          .
        </StateCard>
      ) : error || !technology ? (
        <StateCard tone="error">
          {error ?? "Technology not found in the active project."}
        </StateCard>
      ) : (
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <TechnologyForm
            initialValues={technologyToFormValues(technology)}
            submitLabel="Save changes"
            onSubmit={handleUpdateTechnology}
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
