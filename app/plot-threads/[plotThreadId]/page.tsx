"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { EntityImageGallery } from "@/components/attachments/entity-image-gallery";
import { EntityDeleteButton } from "@/components/layout/entity-delete-button";
import { PageShell } from "@/components/layout/page-shell";
import { PlotThreadDetailSection } from "@/components/plot-threads/plot-thread-detail-section";
import { usePlotThread } from "@/hooks/use-plot-thread";
import { deleteEntityForProject } from "@/lib/data/entity-deletions";

export default function PlotThreadDetailPage() {
  const params = useParams<{ plotThreadId: string }>();
  const plotThreadId =
    typeof params.plotThreadId === "string" ? params.plotThreadId : null;
  const { plotThread, loading, error, user, activeProjectId, activeProject } =
    usePlotThread(plotThreadId);

  return (
    <PageShell
      eyebrow="Plot Threads"
      title={plotThread?.title ?? "Plot thread detail"}
      description="Plot-thread records are loaded from the active project's scoped plot_threads rows so narrative-thread references stay scoped to the current story bible."
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
              Scope: Supabase rows filtered by user_id and project_id for plot_threads/
              {plotThreadId ?? "{plotThreadId}"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/plot-threads"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to plot threads
            </Link>
            {plotThread ? (
              <>
                <Link
                  href={`/plot-threads/${plotThread.id}/edit`}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
                >
                  Edit plot thread
                </Link>
                <EntityDeleteButton
                  entityLabel="plot thread"
                  entityTitle={plotThread.title}
                  onDelete={() =>
                    deleteEntityForProject(
                      user?.uid ?? "",
                      activeProjectId ?? "",
                      "plot_threads",
                      plotThread.id
                    )
                  }
                  redirectHref="/plot-threads"
                />
              </>
            ) : null}
          </div>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to view this plot thread.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading plot-thread details...</StateCard>
      ) : !activeProjectId || !activeProject ? (
        <StateCard tone="neutral">
          No active project selected. Choose one on the{" "}
          <Link href="/projects" className="font-medium underline">
            projects page
          </Link>
          .
        </StateCard>
      ) : error || !plotThread ? (
        <StateCard tone="error">
          {error ?? "Plot thread not found in the active project."}
        </StateCard>
      ) : (
        <>
          <EntityImageGallery
            uid={user.uid}
            projectId={activeProjectId}
            entityType="plot_threads"
            entityId={plotThread.id}
          />

          <PlotThreadDetailSection title="Summary">
            <div className="space-y-3 text-sm leading-6 text-zinc-700">
              <p>{plotThread.summary || "No summary yet."}</p>
              <p>{plotThread.description || "No full description yet."}</p>
            </div>
          </PlotThreadDetailSection>

          <PlotThreadDetailSection title="Core details">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Status" value={formatEnumValue(plotThread.status)} />
              <DetailItem
                label="Thread type"
                value={formatEnumValue(plotThread.threadType)}
              />
              <DetailItem
                label="Introduced in book"
                value={plotThread.introducedInBookId ?? "None"}
              />
              <DetailItem
                label="Resolved in book"
                value={plotThread.resolvedInBookId ?? "Unresolved"}
              />
              <DetailItem
                label="Canon level"
                value={formatEnumValue(plotThread.canonLevel)}
              />
              <DetailItem label="Confidence" value={formatEnumValue(plotThread.confidence)} />
              <DetailItem label="Slug" value={plotThread.slug} />
            </div>
          </PlotThreadDetailSection>

          <PlotThreadDetailSection title="Linked records">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Book IDs" values={plotThread.bookIds} />
              <ListBlock label="Chapter IDs" values={plotThread.chapterIds} />
              <ListBlock label="Scene IDs" values={plotThread.sceneIds} />
              <ListBlock label="Character IDs" values={plotThread.characterIds} />
              <ListBlock label="Timeline event IDs" values={plotThread.timelineEventIds} />
              <ListBlock label="Theme IDs" values={plotThread.themeIds} />
              <ListBlock label="Note IDs" values={plotThread.noteIds} />
              <ListBlock label="Tags" values={plotThread.tags} />
            </div>
          </PlotThreadDetailSection>

          <PlotThreadDetailSection title="Narrative development">
            <div className="grid gap-4 lg:grid-cols-3">
              <ListBlock label="Setup notes" values={plotThread.setupNotes} />
              <ListBlock label="Payoff notes" values={plotThread.payoffNotes} />
              <ListBlock label="Open questions" values={plotThread.openQuestions} />
            </div>
          </PlotThreadDetailSection>

          <PlotThreadDetailSection title="Public wiki summary">
            <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-700">
              {plotThread.publicWikiSummary || "No public wiki summary stored yet."}
            </p>
          </PlotThreadDetailSection>
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
