import {
  formatTimelineEventBoundaryLabel,
} from "@/lib/timeline/workspace";
import type { TimelineEvent } from "@/types/timeline-event";

type TimelineWorkspaceEventCardProps = {
  onView: (timelineEventId: string) => void;
  position: number;
  selected?: boolean;
  timelineEvent: TimelineEvent;
};

export function TimelineWorkspaceEventCard({
  onView,
  position,
  selected = false,
  timelineEvent,
}: TimelineWorkspaceEventCardProps) {
  return (
    <article
      className={`rounded-3xl border p-5 shadow-[0_20px_45px_-38px_rgba(24,24,27,0.4)] transition ${
        selected
          ? "border-zinc-950 bg-zinc-50"
          : "border-zinc-200 bg-white hover:border-zinc-300"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Block {position}
          </p>
          <h3 className="mt-2 text-lg font-semibold tracking-tight text-zinc-950">
            {timelineEvent.title}
          </h3>
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
          {timelineEvent.displayDateLabel.trim() || "Undated"}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-200 pt-4">
        <p className="min-w-0 truncate text-sm text-zinc-600">
          {formatTimelineEventStartLabel(timelineEvent)}
        </p>
        <button
          type="button"
          onClick={() => onView(timelineEvent.id)}
          className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          View Event
        </button>
      </div>
    </article>
  );
}

function formatTimelineEventStartLabel(timelineEvent: TimelineEvent) {
  const startLabel = formatTimelineEventBoundaryLabel(timelineEvent, "start");
  const timeLabel = timelineEvent.timeOfDayLabel.trim();

  if (startLabel && timeLabel) {
    return `${startLabel} ${timeLabel}`;
  }

  if (startLabel) {
    return startLabel;
  }

  if (timeLabel) {
    return timeLabel;
  }

  return "Undated start";
}
