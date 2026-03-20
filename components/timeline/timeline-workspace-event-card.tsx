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
      className={`rounded-3xl border p-4 shadow-sm transition ${
        selected
          ? "border-amber-300 bg-amber-50/80 shadow-amber-100"
          : "border-zinc-200 bg-white shadow-zinc-950/5"
      }`}
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Block {position}
        </p>
        <h3 className="mt-2 text-lg font-semibold tracking-tight text-zinc-950">
          {timelineEvent.title}
        </h3>
      </div>

      <button
        type="button"
        onClick={() => onView(timelineEvent.id)}
        className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
      >
        View Event
      </button>
    </article>
  );
}
