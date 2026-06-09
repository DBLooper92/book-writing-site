"use client";

import type { ReactNode } from "react";

import type { TimelineWorkspaceFilters } from "@/lib/timeline/workspace";
import {
  TIMELINE_WORKSPACE_DATING_OPTIONS,
  TIMELINE_WORKSPACE_LINK_SCOPE_OPTIONS,
  TIMELINE_WORKSPACE_STATUS_OPTIONS,
  TIMELINE_WORKSPACE_TYPE_OPTIONS,
} from "@/lib/timeline/workspace";

export type TimelineWorkspaceViewMode = "timeline" | "scroll";

type TimelineWorkspaceControlsProps = {
  filters: TimelineWorkspaceFilters;
  totalCount: number;
  visibleCount: number;
  hasActiveFilters: boolean;
  pinned: boolean;
  viewMode: TimelineWorkspaceViewMode;
  onChange: (updates: Partial<TimelineWorkspaceFilters>) => void;
  onReset: () => void;
  onTogglePinned: () => void;
  onViewModeChange: (viewMode: TimelineWorkspaceViewMode) => void;
};

export function TimelineWorkspaceControls({
  filters,
  totalCount,
  visibleCount,
  hasActiveFilters,
  pinned,
  viewMode,
  onChange,
  onReset,
  onTogglePinned,
  onViewModeChange,
}: TimelineWorkspaceControlsProps) {
  return (
    <section className="border-b border-zinc-200 bg-white/92 px-4 py-4 backdrop-blur sm:px-6 sm:py-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center">
        <div className="min-w-0">
          <p className="text-sm leading-6 text-zinc-600">
            Showing {visibleCount} of {totalCount} events from the active project.
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
            {viewMode === "timeline" ? "Visual chronology" : "Reading mode"}
          </p>
        </div>

        <div className="flex items-center justify-start lg:justify-center">
          <div
            className="inline-flex rounded-full border border-zinc-200 bg-zinc-100 p-1 shadow-[0_10px_26px_-20px_rgba(24,24,27,0.55)]"
            role="tablist"
            aria-label="Timeline view mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "timeline"}
              onClick={() => onViewModeChange("timeline")}
              className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition ${
                viewMode === "timeline"
                  ? "bg-white text-zinc-950 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              Timeline
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "scroll"}
              onClick={() => onViewModeChange("scroll")}
              className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition ${
                viewMode === "scroll"
                  ? "bg-white text-zinc-950 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              Scroll
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <button
            type="button"
            onClick={onReset}
            disabled={!hasActiveFilters}
            className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:border-zinc-100 disabled:text-zinc-400"
          >
            Reset filters
          </button>
          <button
            type="button"
            onClick={onTogglePinned}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
              pinned
                ? "border-zinc-950 bg-zinc-950 text-white hover:bg-zinc-800"
                : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
            aria-label={pinned ? "Unpin filters" : "Pin filters"}
            title={pinned ? "Unpin filters" : "Pin filters"}
          >
            {pinned ? <PinnedIcon /> : <UnpinnedIcon />}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Field label="Search">
          <input
            value={filters.search}
            onChange={(event) => onChange({ search: event.target.value })}
            placeholder="Search title, summary, IDs, causes..."
            className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:bg-white"
          />
        </Field>

        <SelectField
          label="Status"
          value={filters.status}
          options={TIMELINE_WORKSPACE_STATUS_OPTIONS}
          onChange={(value) => onChange({ status: value })}
        />

        <SelectField
          label="Event type"
          value={filters.eventType}
          options={TIMELINE_WORKSPACE_TYPE_OPTIONS}
          onChange={(value) => onChange({ eventType: value })}
        />

        <SelectField
          label="Dating"
          value={filters.dating}
          options={TIMELINE_WORKSPACE_DATING_OPTIONS}
          onChange={(value) => onChange({ dating: value })}
        />

        <SelectField
          label="Linked scope"
          value={filters.linkScope}
          options={TIMELINE_WORKSPACE_LINK_SCOPE_OPTIONS}
          onChange={(value) => onChange({ linkScope: value })}
        />
      </div>
    </section>
  );
}

function PinnedIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 4l5 5" />
      <path d="M8 9l7-5 5 5-5 7" />
      <path d="M9 10l5 5" />
      <path d="M6 21l5-5" />
    </svg>
  );
}

function UnpinnedIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 4l5 5" />
      <path d="M8 9l7-5 5 5-5 7" />
      <path d="M9 10l5 5" />
      <path d="M6 21l5-5" />
      <path d="M4 4l16 16" />
    </svg>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-zinc-700">{label}</span>
      {children}
    </label>
  );
}

function SelectField<Value extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: Value;
  options: ReadonlyArray<{ value: Value; label: string }>;
  onChange: (value: Value) => void;
}) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as Value)}
        className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:bg-white"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
