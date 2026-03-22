"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { OrganizationForm } from "@/components/organizations/organization-form";
import { useOrganization } from "@/hooks/use-organization";
import { updateOrganizationForProject } from "@/lib/data/organizations";
import {
  organizationToFormValues,
  type NormalizedOrganizationFormValues,
} from "@/types/organization";

export default function EditOrganizationPage() {
  const params = useParams<{ organizationId: string }>();
  const router = useRouter();
  const organizationId =
    typeof params.organizationId === "string" ? params.organizationId : null;
  const { organization, loading, error, user, uid, activeProjectId, activeProject } =
    useOrganization(organizationId);

  async function handleUpdateOrganization(values: NormalizedOrganizationFormValues) {
    if (!uid || !activeProjectId || !organizationId) {
      throw new Error("Organization context is missing.");
    }

    await updateOrganizationForProject(uid, activeProjectId, organizationId, values);
    router.push(`/organizations/${organizationId}`);
  }

  return (
    <PageShell
      eyebrow="Organizations"
      title={organization ? `Edit ${organization.name}` : "Edit organization"}
      description="Update the first set of structured organization fields and write the changes back to the currently active project's nested organization document."
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
              href="/organizations"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to organizations
            </Link>
            {organizationId ? (
              <Link
                href={`/organizations/${organizationId}`}
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
          Sign in first to edit organizations.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading organization data...</StateCard>
      ) : !activeProjectId || !activeProject ? (
        <StateCard tone="neutral">
          No active project selected. Choose one on the{" "}
          <Link href="/projects" className="font-medium underline">
            projects page
          </Link>
          .
        </StateCard>
      ) : error || !organization ? (
        <StateCard tone="error">
          {error ?? "Organization not found in the active project."}
        </StateCard>
      ) : (
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <OrganizationForm
            initialValues={organizationToFormValues(organization)}
            submitLabel="Save changes"
            onSubmit={handleUpdateOrganization}
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
