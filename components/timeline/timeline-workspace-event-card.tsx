import Link from "next/link";
import type { ReactNode } from "react";

import {
  formatTimelineEnumValue,
  formatTimelineEventRange,
  getTimelineEventChronologyLabel,
  hasTimelineContinuityLinks,
} from "@/lib/timeline/workspace";
import type { TimelineEvent } from "@/types/timeline-event";

type TimelineWorkspaceEventCardProps = {
  timelineEvent: TimelineEvent;
};

type LinkedGroup = {
  label: string;
  ids: string[];
  basePath: string;
};

const MAX_VISIBLE_LINKS_PER_GROUP = 4;

export function TimelineWorkspaceEventCard({
  timelineEvent,
}: TimelineWorkspaceEventCardProps) {
  const linkedGroups = [
    buildLinkedGroup("Books", timelineEvent.bookIds, "/books"),
    buildLinkedGroup("Chapters", timelineEvent.chapterIds, "/chapters"),
    buildLinkedGroup("Scenes", timelineEvent.sceneIds, "/scenes"),
    buildLinkedGroup("Characters", timelineEvent.characterIds, "/characters"),
    buildLinkedGroup("Locations", timelineEvent.locationIds, "/locations"),
    buildLinkedGroup("Era", timelineEvent.eraId ? [timelineEvent.eraId] : [], "/eras"),
    buildLinkedGroup("Factions", timelineEvent.factionIds, "/factions"),
    buildLinkedGroup("Cultures", timelineEvent.cultureIds, "/cultures"),
    buildLinkedGroup("Religions", timelineEvent.religionIds, "/religions"),
    buildLinkedGroup("Technologies", timelineEvent.technologyIds, "/technologies"),
    buildLinkedGroup("Plot Threads", timelineEvent.plotThreadIds, "/plot-threads"),
    buildLinkedGroup("Themes", timelineEvent.themeIds, "/themes"),
  ].filter((group): group is LinkedGroup => group !== null);
  const continuityGroups = [
    buildLinkedGroup("Predecessors", timelineEvent.predecessorEventIds, "/timeline-events"),
    buildLinkedGroup("Successors", timelineEvent.successorEventIds, "/timeline-events"),
  ].filter((group): group is LinkedGroup => group !== null);
  const chronologyLabel = getTimelineEventChronologyLabel(timelineEvent);
  const numericRangeLabel = formatTimelineEventRange(
    timelineEvent.yearStart,
    timelineEvent.yearEnd
  );
  const showNumericRange =
    timelineEvent.displayDateLabel.trim().length > 0 && chronologyLabel !== numericRangeLabel;

  return (
    <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-zinc-950">
            <Link
              href={`/timeline-events/${timelineEvent.id}`}
              className="transition hover:text-zinc-700"
            >
              {timelineEvent.title}
            </Link>
          </h3>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            {timelineEvent.summary || "No summary yet."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <Badge>{chronologyLabel}</Badge>
          {showNumericRange ? <Badge>{numericRangeLabel}</Badge> : null}
          <Badge>{formatTimelineEnumValue(timelineEvent.status)}</Badge>
          <Badge>{formatTimelineEnumValue(timelineEvent.eventType)}</Badge>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-500">
        <span>ID: {timelineEvent.id}</span>
        <span>Slug: {timelineEvent.slug}</span>
        <span>Causes: {timelineEvent.causes.length}</span>
        <span>Consequences: {timelineEvent.consequences.length}</span>
      </div>

      {linkedGroups.length > 0 ? (
        <div className="mt-5 grid gap-3 xl:grid-cols-2">
          {linkedGroups.map((group) => (
            <LinkedGroupBlock key={group.label} group={group} />
          ))}
        </div>
      ) : (
        <EmptyHint className="mt-5">No manuscript or entity links stored yet.</EmptyHint>
      )}

      {hasTimelineContinuityLinks(timelineEvent) ? (
        <div className="mt-5 grid gap-3 xl:grid-cols-2">
          {continuityGroups.map((group) => (
            <LinkedGroupBlock key={group.label} group={group} />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function buildLinkedGroup(label: string, ids: string[], basePath: string) {
  return ids.length > 0 ? { label, ids, basePath } : null;
}

function LinkedGroupBlock({ group }: { group: LinkedGroup }) {
  const visibleIds = group.ids.slice(0, MAX_VISIBLE_LINKS_PER_GROUP);
  const hiddenCount = Math.max(0, group.ids.length - visibleIds.length);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
        {group.label}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {visibleIds.map((id) => (
          <Link
            key={`${group.label}-${id}`}
            href={`${group.basePath}/${id}`}
            className="rounded-full bg-white px-3 py-1 text-sm text-zinc-700 ring-1 ring-zinc-200 transition hover:bg-zinc-100"
          >
            {id}
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

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700">{children}</span>;
}

function EmptyHint({
  children,
  className,
}: {
  children: ReactNode;
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
