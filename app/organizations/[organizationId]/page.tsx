"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { OrganizationDetailSection } from "@/components/organizations/organization-detail-section";
import { useOrganization } from "@/hooks/use-organization";

export default function OrganizationDetailPage() {
  const params = useParams<{ organizationId: string }>();
  const organizationId =
    typeof params.organizationId === "string" ? params.organizationId : null;
  const { organization, loading, error, user, activeProjectId, activeProject } =
    useOrganization(organizationId);

  return (
    <PageShell
      eyebrow="Organizations"
      title={organization?.name ?? "Organization detail"}
      description="Organization records are loaded from the active project's nested organizations collection so institutional references stay scoped to the current story bible."
    >
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
              Active project
            </p>
            <p className="mt-2 text-sm text-zinc-700">
              {activeProject
                ? `${activeProject.title} (${activeProject.id})`
                : "No active project selected"}
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
              Scope: Supabase rows filtered by user_id and project_id for organizations/
              {organizationId ?? "{organizationId}"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/organizations"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to organizations
            </Link>
            {organization ? (
              <Link
                href={`/organizations/${organization.id}/edit`}
                className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                Edit organization
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to view this organization.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading organization details...</StateCard>
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
        <>
          <OrganizationDetailSection title="Summary">
            <div className="space-y-3 text-sm leading-6 text-zinc-700">
              <p>{organization.summary || "No summary yet."}</p>
              <p>{organization.description || "No full description yet."}</p>
            </div>
          </OrganizationDetailSection>

          <OrganizationDetailSection title="Core details">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Status" value={formatEnumValue(organization.status)} />
              <DetailItem
                label="Organization type"
                value={formatEnumValue(organization.organizationType)}
              />
              <DetailItem
                label="Founded year"
                value={formatOptionalNumber(organization.foundedYear)}
              />
              <DetailItem
                label="Member estimate"
                value={formatOptionalNumber(organization.memberCountEstimate)}
              />
              <DetailItem
                label="Canon level"
                value={formatEnumValue(organization.canonLevel)}
              />
              <DetailItem label="Slug" value={organization.slug} />
            </div>
          </OrganizationDetailSection>

          <OrganizationDetailSection title="Leadership and operations">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Base location IDs" values={organization.baseLocationIds} />
              <ListBlock label="Leader titles" values={organization.leaderTitles} />
              <ListBlock label="Goals" values={organization.goals} />
              <ListBlock label="Resources" values={organization.resources} />
            </div>
          </OrganizationDetailSection>

          <OrganizationDetailSection title="Links and references">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Alliance IDs" values={organization.alliances} />
              <ListBlock label="Rival IDs" values={organization.rivals} />
              <ListBlock label="Tags" values={organization.tags} />
            </div>
          </OrganizationDetailSection>

          <OrganizationDetailSection title="Public wiki summary">
            <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-700">
              {organization.publicWikiSummary || "No public wiki summary stored yet."}
            </p>
          </OrganizationDetailSection>
        </>
      )}
    </PageShell>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 wrap-break-word text-sm font-medium text-zinc-900">{value}</p>
    </div>
  );
}

function ListBlock({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.length > 0 ? (
          values.map((value) => (
            <span
              key={`${label}-${value}`}
              className="rounded-full bg-white px-3 py-1 text-sm text-zinc-700 ring-1 ring-zinc-200"
            >
              {value}
            </span>
          ))
        ) : (
          <span className="text-sm text-zinc-500">None</span>
        )}
      </div>
    </div>
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

function formatEnumValue(value: string) {
  if (!value) {
    return "Unknown";
  }

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatOptionalNumber(value: number | null) {
  return typeof value === "number" ? String(value) : "Unknown";
}
