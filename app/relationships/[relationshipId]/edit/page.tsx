"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { RelationshipForm } from "@/components/relationships/relationship-form";
import { useRelationship } from "@/hooks/use-relationship";
import { updateRelationshipForProject } from "@/lib/data/relationships";
import {
  relationshipToFormValues,
  type NormalizedRelationshipFormValues,
} from "@/types/relationship";

export default function EditRelationshipPage() {
  const params = useParams<{ relationshipId: string }>();
  const router = useRouter();
  const relationshipId =
    typeof params.relationshipId === "string" ? params.relationshipId : null;
  const { relationship, loading, error, user, uid, activeProjectId, activeProject } =
    useRelationship(relationshipId);

  async function handleUpdateRelationship(values: NormalizedRelationshipFormValues) {
    if (!uid || !activeProjectId || !relationshipId) {
      throw new Error("Relationship context is missing.");
    }

    await updateRelationshipForProject(uid, activeProjectId, relationshipId, values);
    router.push(`/relationships/${relationshipId}`);
  }

  return (
    <PageShell
      eyebrow="Relationships"
      title={relationship ? `Edit ${relationship.title}` : "Edit relationship"}
      description="Update the first set of structured relationship fields and write the changes back to the currently active project's scoped relationship row."
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
              href="/relationships"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to relationships
            </Link>
            {relationshipId ? (
              <Link
                href={`/relationships/${relationshipId}`}
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
          Sign in first to edit relationships.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading relationship data...</StateCard>
      ) : !activeProjectId || !activeProject ? (
        <StateCard tone="neutral">
          No active project selected. Choose one on the{" "}
          <Link href="/projects" className="font-medium underline">
            projects page
          </Link>
          .
        </StateCard>
      ) : error || !relationship ? (
        <StateCard tone="error">
          {error ?? "Relationship not found in the active project."}
        </StateCard>
      ) : (
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <RelationshipForm
            initialValues={relationshipToFormValues(relationship)}
            submitLabel="Save changes"
            onSubmit={handleUpdateRelationship}
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
