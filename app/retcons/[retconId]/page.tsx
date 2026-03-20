"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { RetconDetailSection } from "@/components/retcons/retcon-detail-section";
import { useRetcon } from "@/hooks/use-retcon";

export default function RetconDetailPage() {
  const params = useParams<{ retconId: string }>();
  const retconId = typeof params.retconId === "string" ? params.retconId : null;
  const { retcon, loading, error, user, activeProjectId, activeProject } = useRetcon(retconId);

  return (
    <PageShell
      eyebrow="Retcons"
      title={retcon?.title ?? "Retcon detail"}
      description="Retcon records are loaded from the active project's nested retcons collection so each detail view stays scoped to the current story bible."
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
              Scope: users/{`{uid}`}/projects/{activeProjectId ?? "{projectId}"}/retcons/
              {retconId ?? "{retconId}"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/retcons"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to retcons
            </Link>
            {retcon ? (
              <Link
                href={`/retcons/${retcon.id}/edit`}
                className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                Edit retcon
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to view this retcon.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading retcon details...</StateCard>
      ) : !activeProjectId || !activeProject ? (
        <StateCard tone="neutral">
          No active project selected. Choose one on the{" "}
          <Link href="/projects" className="font-medium underline">
            projects page
          </Link>
          .
        </StateCard>
      ) : error || !retcon ? (
        <StateCard tone="error">{error ?? "Retcon not found in the active project."}</StateCard>
      ) : (
        <>
          <RetconDetailSection title="Summary">
            <div className="space-y-3 text-sm leading-6 text-zinc-700">
              <p>{retcon.summary || "No summary yet."}</p>
              <p>{retcon.description || "No full description yet."}</p>
            </div>
          </RetconDetailSection>

          <RetconDetailSection title="Canon change">
            <div className="grid gap-6 lg:grid-cols-2">
              <TextBlock label="Old canon" value={retcon.oldCanon} />
              <TextBlock label="New canon" value={retcon.newCanon} />
            </div>
          </RetconDetailSection>

          <RetconDetailSection title="Status and impact">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <DetailItem label="Status" value={formatEnumLabel(retcon.status)} />
              <DetailItem label="Impact level" value={formatEnumLabel(retcon.impactLevel)} />
              <DetailItem label="Resolved" value={retcon.resolved ? "Yes" : "No"} />
              <DetailItem label="Canon level" value={retcon.canonLevel} />
            </div>
            <div className="mt-4">
              <TextBlock label="Reason" value={retcon.reason} />
            </div>
          </RetconDetailSection>

          <RetconDetailSection title="Affected records">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Affected entity types" values={retcon.affectedEntityTypes} />
              <ListBlock label="Affected entity IDs" values={retcon.affectedEntityIds} />
              <ListBlock label="Tags" values={retcon.tags} />
            </div>
          </RetconDetailSection>
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

function TextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-700">
        {value || "None yet."}
      </p>
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

function formatEnumLabel(value: string) {
  return value.replace(/_/g, " ");
}
