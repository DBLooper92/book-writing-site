import Link from "next/link";

import {
  buildTimelineLinkedReferenceGroups,
  type TimelineLinkedReferenceGroup,
  type TimelineReferenceMaps,
  type TimelineReferenceSets,
} from "@/lib/timeline/references";
import {
  formatTimelineEnumValue,
  formatDetailedTimelineEventRange,
  formatTimelineEventSequenceLabel,
  getTimelineEventChronologyLabel,
  getTimelineWorkspaceIssues,
  hasTimelineContinuityLinks,
} from "@/lib/timeline/workspace";
import type { TimelineEvent } from "@/types/timeline-event";

type TimelineWorkspaceEventCardProps = {
  knownTimelineEventIds: ReadonlySet<string>;
  referenceMaps?: TimelineReferenceMaps | null;
  referenceSets?: TimelineReferenceSets | null;
  selected?: boolean;
  timelineEvent: TimelineEvent;
};

const MAX_GROUPS = 4;
const MAX_IDS_PER_GROUP = 2;

export function TimelineWorkspaceEventCard({
  knownTimelineEventIds,
  referenceMaps,
  referenceSets,
  selected = false,
  timelineEvent,
}: TimelineWorkspaceEventCardProps) {
  const issues = getTimelineWorkspaceIssues(
    timelineEvent,
    knownTimelineEventIds,
    referenceSets
  );
  const chronologyLabel = getTimelineEventChronologyLabel(timelineEvent);
  const numericRangeLabel = formatDetailedTimelineEventRange(timelineEvent);
  const showNumericRange =
    chronologyLabel !== numericRangeLabel && timelineEvent.displayDateLabel.trim().length > 0;
  const sequenceLabel = formatTimelineEventSequenceLabel(timelineEvent);
  const allReferenceGroups = referenceMaps
    ? buildTimelineLinkedReferenceGroups(timelineEvent, referenceMaps)
    : [];
  const linkedGroups = allReferenceGroups
    .filter((group) => group.label !== "Predecessors" && group.label !== "Successors")
    .slice(0, MAX_GROUPS);
  const continuityGroups = allReferenceGroups.filter(
    (group) => group.label === "Predecessors" || group.label === "Successors"
  );

  return (
    <article
      className={`rounded-[1.75rem] border p-5 shadow-sm transition ${
        selected
          ? "border-amber-300 bg-amber-50/80 shadow-amber-100"
          : "border-zinc-200 bg-white shadow-zinc-950/5"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            {chronologyLabel}
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-zinc-950">
            <Link
              href={`/timeline-events/${timelineEvent.id}`}
              className="transition hover:text-zinc-700"
            >
              {timelineEvent.title}
            </Link>
          </h3>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-medium">
          {showNumericRange ? <Badge>{numericRangeLabel}</Badge> : null}
          {sequenceLabel ? <Badge>{sequenceLabel}</Badge> : null}
          <Badge>{formatTimelineEnumValue(timelineEvent.eventType)}</Badge>
          <Badge>{formatTimelineEnumValue(timelineEvent.status)}</Badge>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-zinc-700">
        {timelineEvent.summary || "No summary yet."}
      </p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-500">
        <span className="rounded-full bg-zinc-100 px-3 py-1">ID: {timelineEvent.id}</span>
        <span className="rounded-full bg-zinc-100 px-3 py-1">
          Causes: {timelineEvent.causes.length}
        </span>
        <span className="rounded-full bg-zinc-100 px-3 py-1">
          Consequences: {timelineEvent.consequences.length}
        </span>
        {issues.length > 0 ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900">
            {issues.length} warning{issues.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {linkedGroups.length > 0 ? (
        <div className="mt-5 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Connections
          </p>
          <div className="space-y-3">
            {linkedGroups.map((group) => (
              <LinkedGroupRow key={group.label} group={group} />
            ))}
          </div>
        </div>
      ) : (
        <EmptyHint className="mt-5">No cross-slice links stored yet.</EmptyHint>
      )}

      {hasTimelineContinuityLinks(timelineEvent) ? (
        <div className="mt-5 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Continuity
          </p>
          <div className="space-y-3">
            {continuityGroups.map((group) => (
              <LinkedGroupRow key={group.label} group={group} />
            ))}
          </div>
        </div>
      ) : null}

      {issues.length > 0 ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {issues[0].message}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={`/timeline-events/${timelineEvent.id}`}
          className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          Open event
        </Link>
        <Link
          href={`/timeline-events/${timelineEvent.id}/edit`}
          className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          Edit event
        </Link>
      </div>
    </article>
  );
}

function LinkedGroupRow({ group }: { group: TimelineLinkedReferenceGroup }) {
  const visibleItems = group.items.slice(0, MAX_IDS_PER_GROUP);
  const hiddenCount = Math.max(0, group.items.length - visibleItems.length);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          {group.label}
        </span>
        <span className="text-xs text-zinc-500">{group.items.length} linked</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {visibleItems.map((item) => (
          <Link
            key={`${group.label}-${item.id}`}
            href={item.href}
            className={`rounded-full px-3 py-1 text-sm transition ${
              item.missing
                ? "bg-amber-100 text-amber-900 ring-1 ring-amber-200"
                : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-100"
            }`}
            title={item.meta ? `${item.label} - ${item.meta}` : item.label}
          >
            {item.label}
          </Link>
        ))}
        {hiddenCount > 0 ? (
          <span className="rounded-full bg-white px-3 py-1 text-sm text-zinc-500 ring-1 ring-zinc-200">
            +{hiddenCount} more
          </span>
        ) : null}
      </div>
    </div>
  );
}

function Badge({ children }: { children: string }) {
  return <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700">{children}</span>;
}

function EmptyHint({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 text-sm text-zinc-500 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
