"use client";

import Link from "next/link";

import { TimelineEventDetailSection } from "@/components/timeline-events/timeline-event-detail-section";
import {
  buildTimelineLinkedReferenceGroups,
  type TimelineReferenceMaps,
  type TimelineReferenceSets,
} from "@/lib/timeline/references";
import {
  formatDetailedTimelineEventRange,
  formatTimelineEventBoundaryLabel,
  formatTimelineEnumValue,
  formatTimelineEventSequenceLabel,
  getTimelineWorkspaceIssues,
} from "@/lib/timeline/workspace";
import type { TimelineEvent } from "@/types/timeline-event";

type TimelineEventDetailViewProps = {
  knownTimelineEventIds: ReadonlySet<string>;
  referenceMaps: TimelineReferenceMaps;
  referenceSets: TimelineReferenceSets;
  timelineEvent: TimelineEvent;
};

export function TimelineEventDetailView({
  knownTimelineEventIds,
  referenceMaps,
  referenceSets,
  timelineEvent,
}: TimelineEventDetailViewProps) {
  const linkedGroups = buildTimelineLinkedReferenceGroups(timelineEvent, referenceMaps);
  const manuscriptGroups = linkedGroups.filter((group) =>
    ["Books", "Chapters", "Scenes", "Predecessors", "Successors"].includes(group.label)
  );
  const entityGroups = linkedGroups.filter((group) =>
    [
      "Characters",
      "Locations",
      "Era",
      "Factions",
      "Cultures",
      "Religions",
      "Technologies",
      "Plot threads",
      "Themes",
    ].includes(group.label)
  );
  const issues = getTimelineWorkspaceIssues(
    timelineEvent,
    knownTimelineEventIds,
    referenceSets
  );
  const startDateLabel = formatTimelineEventBoundaryLabel(timelineEvent, "start");
  const endDateLabel = formatTimelineEventBoundaryLabel(timelineEvent, "end");

  return (
    <>
      {issues.length > 0 ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 px-6 py-5 text-sm leading-6 text-amber-900">
          <p className="font-medium">Validation warnings</p>
          <div className="mt-2 space-y-1">
            {issues.map((issue) => (
              <p key={issue.message}>{issue.message}</p>
            ))}
          </div>
        </section>
      ) : null}

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
            label="Chronology range"
            value={formatDetailedTimelineEventRange(timelineEvent)}
          />
          <DetailItem label="Start date" value={startDateLabel ?? "None"} />
          <DetailItem label="End date" value={endDateLabel ?? "None"} />
          <DetailItem
            label="Sequence within date"
            value={formatTimelineEventSequenceLabel(timelineEvent) ?? "None"}
          />
          <DetailItem label="Time label" value={timelineEvent.timeOfDayLabel || "None"} />
          <DetailItem
            label="Display date label"
            value={timelineEvent.displayDateLabel || "None"}
          />
          <DetailItem label="Era ID" value={timelineEvent.eraId ?? "None"} />
          <DetailItem label="Canon level" value={formatEnumValue(timelineEvent.canonLevel)} />
          <DetailItem label="Confidence" value={formatEnumValue(timelineEvent.confidence)} />
          <DetailItem label="Slug" value={timelineEvent.slug} />
        </div>
      </TimelineEventDetailSection>

      <TimelineEventDetailSection title="Chronology and manuscript links">
        <div className="grid gap-4 lg:grid-cols-2">
          {manuscriptGroups.map((group) => (
            <LinkedGroupBlock key={group.label} label={group.label} items={group.items} />
          ))}
        </div>
      </TimelineEventDetailSection>

      <TimelineEventDetailSection title="Entity links">
        <div className="grid gap-4 lg:grid-cols-2">
          {entityGroups.map((group) => (
            <LinkedGroupBlock key={group.label} label={group.label} items={group.items} />
          ))}
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

function LinkedGroupBlock({
  label,
  items,
}: {
  label: string;
  items: Array<{ id: string; label: string; href: string; missing: boolean }>;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.length > 0 ? (
          items.map((item) => (
            <Link
              key={`${label}-${item.id}`}
              href={item.href}
              className={`rounded-full px-3 py-1 text-sm transition ${
                item.missing
                  ? "bg-amber-100 text-amber-900 ring-1 ring-amber-200"
                  : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-100"
              }`}
            >
              {item.label}
            </Link>
          ))
        ) : (
          <span className="text-sm text-zinc-500">None</span>
        )}
      </div>
    </div>
  );
}

function formatEnumValue(value: string) {
  return formatTimelineEnumValue(value);
}
