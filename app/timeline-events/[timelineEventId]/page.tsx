"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { EntityImageGallery } from "@/components/attachments/entity-image-gallery";
import { PageShell } from "@/components/layout/page-shell";
import { TimelineEventDetailView } from "@/components/timeline-events/timeline-event-detail-view";
import { useTimelineFormOptions } from "@/hooks/use-timeline-form-options";
import { useTimelineEvent } from "@/hooks/use-timeline-event";

export default function TimelineEventDetailPage() {
  const params = useParams<{ timelineEventId: string }>();
  const timelineEventId =
    typeof params.timelineEventId === "string" ? params.timelineEventId : null;
  const { timelineEvent, loading, error, user, activeProjectId, activeProject } =
    useTimelineEvent(timelineEventId);
  const formOptions = useTimelineFormOptions(timelineEventId);
  const knownTimelineEventIds = new Set(
    formOptions.timelineEventOptions.map((option) => option.value)
  );
  if (timelineEventId) {
    knownTimelineEventIds.add(timelineEventId);
  }

  return (
    <PageShell
      eyebrow="Timeline"
      title={timelineEvent?.title ?? "Timeline event detail"}
      description="Timeline event records are loaded from the active project so chronology remains scoped to the current story bible."
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
              Scope: active project timeline event {timelineEventId ?? "{eventId}"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/timeline"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to timeline
            </Link>
            {timelineEvent ? (
              <Link
                href={`/timeline-events/${timelineEvent.id}/edit`}
                className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                Edit timeline event
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to view this timeline event.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading timeline event details...</StateCard>
      ) : !activeProjectId || !activeProject ? (
        <StateCard tone="neutral">
          No active project selected. Choose one on the{" "}
          <Link href="/projects" className="font-medium underline">
            projects page
          </Link>
          .
        </StateCard>
      ) : error || !timelineEvent ? (
        <StateCard tone="error">
          {error ?? "Timeline event not found in the active project."}
        </StateCard>
      ) : formOptions.loading ? (
        <StateCard tone="neutral">Loading linked detail data...</StateCard>
      ) : formOptions.error ? (
        <StateCard tone="warning">
          Linked label data could not be loaded for this timeline event.
        </StateCard>
      ) : (
        <>
          <EntityImageGallery
            uid={user.uid}
            projectId={activeProjectId}
            entityType="timeline_events"
            entityId={timelineEvent.id}
          />

          <TimelineEventDetailView
            knownTimelineEventIds={knownTimelineEventIds}
            referenceMaps={formOptions.referenceMaps}
            referenceSets={formOptions.referenceSets}
            timelineEvent={timelineEvent}
          />
        </>
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
