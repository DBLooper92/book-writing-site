import Link from "next/link";
import type { ReactNode } from "react";

import type { TimelineEvent } from "@/types/timeline-event";

type TimelineEventCardProps = {
  timelineEvent: TimelineEvent;
};

export function TimelineEventCard({ timelineEvent }: TimelineEventCardProps) {
  return (
    <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
            <Link href={`/timeline-events/${timelineEvent.id}`} className="hover:text-zinc-700">
              {timelineEvent.title}
            </Link>
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            {timelineEvent.summary || "No summary yet."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <Badge>{formatEnumValue(timelineEvent.status)}</Badge>
          <Badge>{formatEventRange(timelineEvent.yearStart, timelineEvent.yearEnd)}</Badge>
          <Badge>{formatEnumValue(timelineEvent.eventType)}</Badge>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-500">
        <span>Slug: {timelineEvent.slug}</span>
        <span>Project: {timelineEvent.projectId}</span>
        <span>Date label: {timelineEvent.displayDateLabel || "n/a"}</span>
        <span>Scenes: {timelineEvent.sceneIds.length}</span>
      </div>
    </article>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700">{children}</span>;
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
