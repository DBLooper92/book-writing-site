"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { TimelineEventDetailSection } from "@/components/timeline-events/timeline-event-detail-section";
import { useTimelineEvent } from "@/hooks/use-timeline-event";

export default function TimelineEventDetailPage() {
  const params = useParams<{ timelineEventId: string }>();
  const timelineEventId =
    typeof params.timelineEventId === "string" ? params.timelineEventId : null;
  const { timelineEvent, loading, error, user, activeProjectId, activeProject } =
    useTimelineEvent(timelineEventId);

  return (
    <PageShell
      eyebrow="Timeline Events"
      title={timelineEvent?.title ?? "Timeline event detail"}
      description="Timeline event records are loaded from the active project's nested timeline_events collection so chronology remains scoped to the current story bible."
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
              Scope: users/{`{uid}`}/projects/{activeProjectId ?? "{projectId}"}/timeline_events/
              {timelineEventId ?? "{eventId}"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/timeline-events"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to timeline events
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
      ) : (
        <>
          <TimelineEventDetailSection title="Summary">
            <div className="space-y-3 text-sm leading-6 text-zinc-700">
              <p>{timelineEvent.summary || "No summary yet."}</p>
              <p>{timelineEvent.description || "No full description yet."}</p>
            </div>
          </TimelineEventDetailSection>

          <TimelineEventDetailSection title="Event details">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Status" value={formatEnumValue(timelineEvent.status)} />
              <DetailItem label="Event type" value={formatEnumValue(timelineEvent.eventType)} />
              <DetailItem
                label="Year range"
                value={formatEventRange(timelineEvent.yearStart, timelineEvent.yearEnd)}
              />
              <DetailItem
                label="Display date label"
                value={timelineEvent.displayDateLabel || "None"}
              />
              <DetailItem label="Era ID" value={timelineEvent.eraId ?? "None"} />
              <DetailItem label="Canon level" value={formatEnumValue(timelineEvent.canonLevel)} />
              <DetailItem
                label="Confidence"
                value={formatEnumValue(timelineEvent.confidence)}
              />
              <DetailItem label="Slug" value={timelineEvent.slug} />
            </div>
          </TimelineEventDetailSection>

          <TimelineEventDetailSection title="Chronology and manuscript links">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Book IDs" values={timelineEvent.bookIds} />
              <ListBlock label="Chapter IDs" values={timelineEvent.chapterIds} />
              <ListBlock label="Scene IDs" values={timelineEvent.sceneIds} />
              <ListBlock label="Predecessor event IDs" values={timelineEvent.predecessorEventIds} />
              <ListBlock label="Successor event IDs" values={timelineEvent.successorEventIds} />
            </div>
          </TimelineEventDetailSection>

          <TimelineEventDetailSection title="Entity links">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Character IDs" values={timelineEvent.characterIds} />
              <ListBlock label="Location IDs" values={timelineEvent.locationIds} />
              <ListBlock label="Faction IDs" values={timelineEvent.factionIds} />
              <ListBlock label="Culture IDs" values={timelineEvent.cultureIds} />
              <ListBlock label="Technology IDs" values={timelineEvent.technologyIds} />
              <ListBlock label="Religion IDs" values={timelineEvent.religionIds} />
              <ListBlock label="Plot thread IDs" values={timelineEvent.plotThreadIds} />
              <ListBlock label="Theme IDs" values={timelineEvent.themeIds} />
            </div>
          </TimelineEventDetailSection>

          <TimelineEventDetailSection title="Causes and consequences">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Causes" values={timelineEvent.causes} />
              <ListBlock label="Consequences" values={timelineEvent.consequences} />
            </div>
          </TimelineEventDetailSection>

          <TimelineEventDetailSection title="Public wiki summary">
            <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-700">
              {timelineEvent.publicWikiSummary || "No public wiki summary stored yet."}
            </p>
          </TimelineEventDetailSection>
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

function formatEventRange(yearStart: number | null, yearEnd: number | null) {
  if (typeof yearStart === "number" && typeof yearEnd === "number") {
    return yearStart === yearEnd ? String(yearStart) : `${yearStart}-${yearEnd}`;
  }

  if (typeof yearStart === "number") {
    return `From ${yearStart}`;
  }

  if (typeof yearEnd === "number") {
    return `Until ${yearEnd}`;
  }

  return "Undated";
}

function formatEnumValue(value: string) {
  if (!value) {
    return "Unknown";
  }

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
