"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { TimelineEventForm } from "@/components/timeline-events/timeline-event-form";
import { useActiveProject } from "@/hooks/use-active-project";
import { createTimelineEventForProject } from "@/lib/firebase/timeline-events";
import {
  createEmptyTimelineEventFormValues,
  type NormalizedTimelineEventFormValues,
} from "@/types/timeline-event";

export default function NewTimelineEventPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, uid, activeProjectId, activeProject, loading } = useActiveProject();
  const initialValues = buildInitialValuesFromSearchParams(searchParams);

  async function handleCreateTimelineEvent(values: NormalizedTimelineEventFormValues) {
    if (!uid || !activeProjectId) {
      throw new Error("Select an active project before creating a timeline event.");
    }

    const timelineEventId = await createTimelineEventForProject(uid, activeProjectId, values);
    router.push(`/timeline-events/${timelineEventId}`);
  }

  return (
    <PageShell
      eyebrow="Timeline Events"
      title="Create timeline event"
      description="Start a new chronology record inside the active project. Timeline insertion notches can prefill continuity and year context here, while the form still writes into the same project-scoped timeline event document shape."
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
                : "A project must be active before timeline event creation can continue."}
            </p>
          </div>

          <Link
            href="/timeline-events"
            className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Back to timeline events
          </Link>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to create timeline events.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading active project context...</StateCard>
      ) : !activeProjectId || !activeProject ? (
        <StateCard tone="neutral">
          No active project selected. Choose one on the{" "}
          <Link href="/projects" className="font-medium underline">
            projects page
          </Link>
          .
        </StateCard>
      ) : (
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <TimelineEventForm
            initialValues={initialValues}
            submitLabel="Create timeline event"
            onSubmit={handleCreateTimelineEvent}
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
  tone: "neutral" | "warning";
}) {
  const className =
    tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-zinc-300 bg-zinc-50 text-zinc-600";

  return (
    <section className={`rounded-3xl border p-6 text-sm leading-6 ${className}`}>
      {children}
    </section>
  );
}

function buildInitialValuesFromSearchParams(searchParams: URLSearchParams) {
  const initialValues = createEmptyTimelineEventFormValues();

  initialValues.yearStart = readQueryValue(searchParams, "yearStart");
  initialValues.yearEnd = readQueryValue(searchParams, "yearEnd");
  initialValues.predecessorEventIds = readQueryValues(searchParams, "predecessorEventIds");
  initialValues.successorEventIds = readQueryValues(searchParams, "successorEventIds");

  return initialValues;
}

function readQueryValue(searchParams: URLSearchParams, key: string) {
  return searchParams.get(key)?.trim() ?? "";
}

function readQueryValues(searchParams: URLSearchParams, key: string) {
  return Array.from(
    new Set(
      (searchParams.get(key) ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}
