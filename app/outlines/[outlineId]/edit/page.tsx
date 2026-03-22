"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { OutlineForm } from "@/components/outlines/outline-form";
import { useOutline } from "@/hooks/use-outline";
import { updateOutlineForProject } from "@/lib/data/outlines";
import { outlineToFormValues, type NormalizedOutlineFormValues } from "@/types/outline";

export default function EditOutlinePage() {
  const params = useParams<{ outlineId: string }>();
  const router = useRouter();
  const outlineId = typeof params.outlineId === "string" ? params.outlineId : null;
  const { outline, loading, error, user, uid, activeProjectId, activeProject } =
    useOutline(outlineId);

  async function handleUpdateOutline(values: NormalizedOutlineFormValues) {
    if (!uid || !activeProjectId || !outlineId) {
      throw new Error("Outline context is missing.");
    }

    await updateOutlineForProject(uid, activeProjectId, outlineId, values);
    router.push(`/outlines/${outlineId}`);
  }

  return (
    <PageShell
      eyebrow="Outlines"
      title={outline ? `Edit ${outline.title}` : "Edit outline"}
      description="Update the first set of structured outline fields and write the changes back to the currently active project's nested outline document."
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
              href="/outlines"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to outlines
            </Link>
            {outlineId ? (
              <Link
                href={`/outlines/${outlineId}`}
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
          Sign in first to edit outlines.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading outline data...</StateCard>
      ) : !activeProjectId || !activeProject ? (
        <StateCard tone="neutral">
          No active project selected. Choose one on the{" "}
          <Link href="/projects" className="font-medium underline">
            projects page
          </Link>
          .
        </StateCard>
      ) : error || !outline ? (
        <StateCard tone="error">{error ?? "Outline not found in the active project."}</StateCard>
      ) : (
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <OutlineForm
            initialValues={outlineToFormValues(outline)}
            submitLabel="Save changes"
            onSubmit={handleUpdateOutline}
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
