"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { GovernmentForm } from "@/components/governments/government-form";
import { PageShell } from "@/components/layout/page-shell";
import { useGovernment } from "@/hooks/use-government";
import { updateGovernmentForProject } from "@/lib/firebase/governments";
import {
  governmentToFormValues,
  type NormalizedGovernmentFormValues,
} from "@/types/government";

export default function EditGovernmentPage() {
  const params = useParams<{ governmentId: string }>();
  const router = useRouter();
  const governmentId =
    typeof params.governmentId === "string" ? params.governmentId : null;
  const { government, loading, error, user, uid, activeProjectId, activeProject } =
    useGovernment(governmentId);

  async function handleUpdateGovernment(values: NormalizedGovernmentFormValues) {
    if (!uid || !activeProjectId || !governmentId) {
      throw new Error("Government context is missing.");
    }

    await updateGovernmentForProject(uid, activeProjectId, governmentId, values);
    router.push(`/governments/${governmentId}`);
  }

  return (
    <PageShell
      eyebrow="Governments"
      title={government ? `Edit ${government.name}` : "Edit government"}
      description="Update the first set of structured government fields and write the changes back to the currently active project's nested government document."
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
              href="/governments"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to governments
            </Link>
            {governmentId ? (
              <Link
                href={`/governments/${governmentId}`}
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
          Sign in first to edit governments.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading government data...</StateCard>
      ) : !activeProjectId || !activeProject ? (
        <StateCard tone="neutral">
          No active project selected. Choose one on the{" "}
          <Link href="/projects" className="font-medium underline">
            projects page
          </Link>
          .
        </StateCard>
      ) : error || !government ? (
        <StateCard tone="error">
          {error ?? "Government not found in the active project."}
        </StateCard>
      ) : (
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <GovernmentForm
            initialValues={governmentToFormValues(government)}
            submitLabel="Save changes"
            onSubmit={handleUpdateGovernment}
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
