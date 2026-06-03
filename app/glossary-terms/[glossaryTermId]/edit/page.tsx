"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { GlossaryTermForm } from "@/components/glossary-terms/glossary-term-form";
import { PageShell } from "@/components/layout/page-shell";
import { useGlossaryTerm } from "@/hooks/use-glossary-term";
import { updateGlossaryTermForProject } from "@/lib/data/glossary-terms";
import {
  glossaryTermToFormValues,
  type NormalizedGlossaryTermFormValues,
} from "@/types/glossary-term";

export default function EditGlossaryTermPage() {
  const params = useParams<{ glossaryTermId: string }>();
  const router = useRouter();
  const glossaryTermId =
    typeof params.glossaryTermId === "string" ? params.glossaryTermId : null;
  const { glossaryTerm, loading, error, user, uid, activeProjectId, activeProject } =
    useGlossaryTerm(glossaryTermId);

  async function handleUpdateGlossaryTerm(values: NormalizedGlossaryTermFormValues) {
    if (!uid || !activeProjectId || !glossaryTermId) {
      throw new Error("Glossary term context is missing.");
    }

    await updateGlossaryTermForProject(uid, activeProjectId, glossaryTermId, values);
    router.push(`/glossary-terms/${glossaryTermId}`);
  }

  return (
    <PageShell
      eyebrow="Glossary Terms"
      title={glossaryTerm ? `Edit ${glossaryTerm.term}` : "Edit glossary term"}
      description="Update the first set of structured glossary fields and write the changes back to the currently active project's scoped glossary row."
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
              href="/glossary-terms"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to glossary terms
            </Link>
            {glossaryTermId ? (
              <Link
                href={`/glossary-terms/${glossaryTermId}`}
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
          Sign in first to edit glossary terms.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading glossary term data...</StateCard>
      ) : !activeProjectId || !activeProject ? (
        <StateCard tone="neutral">
          No active project selected. Choose one on the{" "}
          <Link href="/projects" className="font-medium underline">
            projects page
          </Link>
          .
        </StateCard>
      ) : error || !glossaryTerm ? (
        <StateCard tone="error">
          {error ?? "Glossary term not found in the active project."}
        </StateCard>
      ) : (
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <GlossaryTermForm
            initialValues={glossaryTermToFormValues(glossaryTerm)}
            submitLabel="Save changes"
            onSubmit={handleUpdateGlossaryTerm}
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
