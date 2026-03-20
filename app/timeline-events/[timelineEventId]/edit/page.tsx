"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { TimelineEventForm } from "@/components/timeline-events/timeline-event-form";
import { useTimelineEvent } from "@/hooks/use-timeline-event";
import { updateTimelineEventForProject } from "@/lib/firebase/timeline-events";
import {
  timelineEventToFormValues,
  type NormalizedTimelineEventFormValues,
} from "@/types/timeline-event";

export default function EditTimelineEventPage() {
  const params = useParams<{ timelineEventId: string }>();
  const router = useRouter();
  const timelineEventId =
    typeof params.timelineEventId === "string" ? params.timelineEventId : null;
  const { timelineEvent, loading, error, user, uid, activeProjectId, activeProject } =
    useTimelineEvent(timelineEventId);

  async function handleUpdateTimelineEvent(values: NormalizedTimelineEventFormValues) {
    if (!uid || !activeProjectId || !timelineEventId) {
      throw new Error("Timeline event context is missing.");
    }

    await updateTimelineEventForProject(uid, activeProjectId, timelineEventId, values);
    router.push(`/timeline-events/${timelineEventId}`);
  }

  return (
    <PageShell
      eyebrow="Timeline Events"
      title={timelineEvent ? `Edit ${timelineEvent.title}` : "Edit timeline event"}
      description="Update the first set of structured chronology fields and write the changes back to the active project's nested timeline event document."
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
              href="/timeline-events"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to timeline events
            </Link>
            {timelineEventId ? (
              <Link
                href={`/timeline-events/${timelineEventId}`}
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
          Sign in first to edit timeline events.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading timeline event data...</StateCard>
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
      ) : (
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <TimelineEventForm
            currentTimelineEventId={timelineEventId}
            initialValues={timelineEventToFormValues(timelineEvent)}
            submitLabel="Save changes"
            onSubmit={handleUpdateTimelineEvent}
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
