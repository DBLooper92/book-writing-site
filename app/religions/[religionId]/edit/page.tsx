"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { ReligionForm } from "@/components/religions/religion-form";
import { useReligion } from "@/hooks/use-religion";
import { updateReligionForProject } from "@/lib/data/religions";
import {
  religionToFormValues,
  type NormalizedReligionFormValues,
} from "@/types/religion";

export default function EditReligionPage() {
  const params = useParams<{ religionId: string }>();
  const router = useRouter();
  const religionId = typeof params.religionId === "string" ? params.religionId : null;
  const { religion, loading, error, user, uid, activeProjectId, activeProject } =
    useReligion(religionId);

  async function handleUpdateReligion(values: NormalizedReligionFormValues) {
    if (!uid || !activeProjectId || !religionId) {
      throw new Error("Religion context is missing.");
    }

    await updateReligionForProject(uid, activeProjectId, religionId, values);
    router.push(`/religions/${religionId}`);
  }

  return (
    <PageShell
      eyebrow="Religions"
      title={religion ? `Edit ${religion.name}` : "Edit religion"}
      description="Update the first set of structured religion fields and write the changes back to the currently active project's nested religion document."
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
              href="/religions"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to religions
            </Link>
            {religionId ? (
              <Link
                href={`/religions/${religionId}`}
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
          Sign in first to edit religions.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading religion data...</StateCard>
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
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <ReligionForm
            initialValues={religionToFormValues(religion)}
            submitLabel="Save changes"
            onSubmit={handleUpdateReligion}
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
