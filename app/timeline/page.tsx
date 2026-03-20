"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { TimelineWorkspaceControls } from "@/components/timeline/timeline-workspace-controls";
import { TimelineWorkspaceEventCard } from "@/components/timeline/timeline-workspace-event-card";
import { useTimelineWorkspace } from "@/hooks/use-timeline-workspace";

export default function TimelinePage() {
  const {
    loading,
    error,
    user,
    activeProjectId,
    activeProject,
    filters,
    updateFilters,
    resetFilters,
    hasActiveFilters,
    workspace,
  } = useTimelineWorkspace();

  return (
    <PageShell
      eyebrow="Timeline"
      title="Timeline workspace"
      description="Browse chronology as a project-scoped workspace built directly on top of timeline_events. The first pass groups dated events, keeps undated records visible, and filters by chronology coverage and existing cross-slice links."
    >
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
              Active project context
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {activeProject
                ? `Viewing chronology for ${activeProject.title} (${activeProject.id}).`
                : "Choose an active project to browse timeline data."}
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
              Scope: users/{`{uid}`}/projects/{activeProjectId ?? "{projectId}"}/timeline_events
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/timeline-events"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Timeline event index
            </Link>
            <Link
              href="/timeline-events/new"
              className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Create timeline event
            </Link>
          </div>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to browse timeline data for your projects.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading timeline workspace...</StateCard>
      ) : !activeProjectId || !activeProject ? (
        <StateCard tone="neutral">
          No active project selected. Choose one on the{" "}
          <Link href="/projects" className="font-medium underline">
            projects page
          </Link>
          .
        </StateCard>
      ) : error ? (
        <StateCard tone="error">{error}</StateCard>
      ) : workspace.stats.totalEvents === 0 ? (
        <StateCard tone="neutral">
          No timeline events exist in {activeProject.title} yet.{" "}
          <Link href="/timeline-events/new" className="font-medium underline">
            Create the first timeline event
          </Link>
          .
        </StateCard>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Visible events"
              value={String(workspace.stats.visibleEvents)}
              description={`${workspace.stats.totalEvents} total in the active project.`}
            />
            <StatCard
              label="Dated events"
              value={String(workspace.stats.datedEvents)}
              description={`${workspace.stats.undatedEvents} undated event${workspace.stats.undatedEvents === 1 ? "" : "s"} still need placement.`}
            />
            <StatCard
              label="Chronology range"
              value={formatVisibleRange(
                workspace.stats.earliestVisibleYear,
                workspace.stats.latestVisibleYear
              )}
              description="Based on the visible filtered result set."
            />
            <StatCard
              label="Continuity-linked"
              value={String(workspace.stats.continuityLinkedEvents)}
              description={`${workspace.stats.archivedEvents} archived event${workspace.stats.archivedEvents === 1 ? "" : "s"} across the whole project.`}
            />
          </section>

          <TimelineWorkspaceControls
            filters={filters}
            totalCount={workspace.stats.totalEvents}
            visibleCount={workspace.stats.visibleEvents}
            hasActiveFilters={hasActiveFilters}
            onChange={updateFilters}
            onReset={resetFilters}
          />

          {workspace.filteredEvents.length === 0 ? (
            <StateCard tone="neutral">
              No timeline events match the current filters. Adjust or reset the filters to
              restore the chronology view.
            </StateCard>
          ) : (
            <>
              {workspace.datedGroups.length > 0 ? (
                <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
                        Dated chronology
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-zinc-600">
                        Events are grouped by their earliest known placement year.
                      </p>
                    </div>
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      {workspace.datedGroups.length} year bucket
                      {workspace.datedGroups.length === 1 ? "" : "s"}
                    </p>
                  </div>

                  <div className="mt-6 space-y-8">
                    {workspace.datedGroups.map((group) => (
                      <section key={group.anchorYear} className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="h-px flex-1 bg-zinc-200" />
                          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
                            {group.label}
                          </h3>
                          <div className="h-px flex-1 bg-zinc-200" />
                        </div>

                        <div className="grid gap-4">
                          {group.events.map((timelineEvent) => (
                            <TimelineWorkspaceEventCard
                              key={timelineEvent.id}
                              timelineEvent={timelineEvent}
                            />
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                </section>
              ) : null}

              {workspace.undatedEvents.length > 0 ? (
                <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
                        Undated events
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-zinc-600">
                        These records still need chronology placement but remain visible in the
                        workspace.
                      </p>
                    </div>
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      {workspace.undatedEvents.length} undated event
                      {workspace.undatedEvents.length === 1 ? "" : "s"}
                    </p>
                  </div>

                  <div className="mt-6 grid gap-4">
                    {workspace.undatedEvents.map((timelineEvent) => (
                      <TimelineWorkspaceEventCard
                        key={timelineEvent.id}
                        timelineEvent={timelineEvent}
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          )}
        </>
      )}
    </PageShell>
  );
}

function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">{value}</p>
      <p className="mt-3 text-sm leading-6 text-zinc-600">{description}</p>
    </section>
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

function formatVisibleRange(earliestYear: number | null, latestYear: number | null) {
  if (typeof earliestYear !== "number" || typeof latestYear !== "number") {
    return "Undated";
  }

  return earliestYear === latestYear ? String(earliestYear) : `${earliestYear}-${latestYear}`;
}
