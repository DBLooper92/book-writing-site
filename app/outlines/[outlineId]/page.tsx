"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { OutlineDetailSection } from "@/components/outlines/outline-detail-section";
import { useOutline } from "@/hooks/use-outline";

export default function OutlineDetailPage() {
  const params = useParams<{ outlineId: string }>();
  const outlineId = typeof params.outlineId === "string" ? params.outlineId : null;
  const { outline, loading, error, user, activeProjectId, activeProject } =
    useOutline(outlineId);

  return (
    <PageShell
      eyebrow="Outlines"
      title={outline?.title ?? "Outline detail"}
      description="Outline records are loaded from the active project's nested outlines collection so planning documents stay scoped to the current story bible."
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
              Scope: users/{`{uid}`}/projects/{activeProjectId ?? "{projectId}"}/outlines/
              {outlineId ?? "{outlineId}"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/outlines"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to outlines
            </Link>
            {outline ? (
              <Link
                href={`/outlines/${outline.id}/edit`}
                className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                Edit outline
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to view this outline.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading outline details...</StateCard>
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
        <>
          <OutlineDetailSection title="Summary">
            <div className="space-y-3 text-sm leading-6 text-zinc-700">
              <p>{outline.summary || "No summary yet."}</p>
              <p>{outline.description || "No full description yet."}</p>
            </div>
          </OutlineDetailSection>

          <OutlineDetailSection title="Core details">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Status" value={outline.status} />
              <DetailItem label="Outline type" value={outline.outlineType || "outline"} />
              <DetailItem label="Scope" value={outline.scope || "Not set"} />
              <DetailItem label="Canon level" value={outline.canonLevel} />
              <DetailItem label="Confidence" value={outline.confidence} />
            </div>
          </OutlineDetailSection>

          <OutlineDetailSection title="Planning structure">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Act structure" values={outline.actStructure} />
              <ListBlock label="Milestones" values={outline.milestones} />
            </div>
          </OutlineDetailSection>

          <OutlineDetailSection title="Linked records">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Book IDs" values={outline.bookIds} />
              <ListBlock label="Plot thread IDs" values={outline.threadIds} />
              <ListBlock label="Note IDs" values={outline.noteIds} />
              <ListBlock label="Tags" values={outline.tags} />
            </div>
          </OutlineDetailSection>
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
