"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { GovernmentDetailSection } from "@/components/governments/government-detail-section";
import { PageShell } from "@/components/layout/page-shell";
import { useGovernment } from "@/hooks/use-government";

export default function GovernmentDetailPage() {
  const params = useParams<{ governmentId: string }>();
  const governmentId = typeof params.governmentId === "string" ? params.governmentId : null;
  const { government, loading, error, user, activeProjectId, activeProject } =
    useGovernment(governmentId);

  return (
    <PageShell
      eyebrow="Governments"
      title={government?.name ?? "Government detail"}
      description="Government records are loaded from the active project's nested governments collection so civic-power references stay scoped to the current story bible."
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
              Scope: users/{`{uid}`}/projects/{activeProjectId ?? "{projectId}"}/governments/
              {governmentId ?? "{governmentId}"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/governments"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to governments
            </Link>
            {government ? (
              <Link
                href={`/governments/${government.id}/edit`}
                className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                Edit government
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to view this government.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading government details...</StateCard>
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
        <>
          <GovernmentDetailSection title="Summary">
            <div className="space-y-3 text-sm leading-6 text-zinc-700">
              <p>{government.summary || "No summary yet."}</p>
              <p>{government.description || "No full description yet."}</p>
            </div>
          </GovernmentDetailSection>

          <GovernmentDetailSection title="Core details">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Status" value={formatEnumValue(government.status)} />
              <DetailItem
                label="Government type"
                value={formatEnumValue(government.governmentType)}
              />
              <DetailItem
                label="Seat location ID"
                value={government.seatLocationId ?? "None"}
              />
              <DetailItem
                label="Canon level"
                value={formatEnumValue(government.canonLevel)}
              />
              <DetailItem
                label="Confidence"
                value={formatEnumValue(government.confidence)}
              />
              <DetailItem label="Slug" value={government.slug} />
            </div>
          </GovernmentDetailSection>

          <GovernmentDetailSection title="Leadership and authority">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Leader titles" values={government.leaderTitles} />
              <ListBlock label="Law priorities" values={government.lawPriorities} />
            </div>
            <TextBlock label="Jurisdiction notes" value={government.jurisdictionNotes} />
          </GovernmentDetailSection>

          <GovernmentDetailSection title="Linked records">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Faction IDs" values={government.factionIds} />
              <ListBlock label="Organization IDs" values={government.organizationIds} />
              <ListBlock label="Tags" values={government.tags} />
            </div>
          </GovernmentDetailSection>

          <GovernmentDetailSection title="Public wiki summary">
            <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-700">
              {government.publicWikiSummary || "No public wiki summary stored yet."}
            </p>
          </GovernmentDetailSection>
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

function TextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
        {value || "None"}
      </p>
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
