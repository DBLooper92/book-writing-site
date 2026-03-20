"use client";

import type { ReactNode } from "react";

import type { TimelineWorkspaceFilters } from "@/lib/timeline/workspace";
import {
  TIMELINE_WORKSPACE_DATING_OPTIONS,
  TIMELINE_WORKSPACE_LINK_SCOPE_OPTIONS,
  TIMELINE_WORKSPACE_STATUS_OPTIONS,
  TIMELINE_WORKSPACE_TYPE_OPTIONS,
} from "@/lib/timeline/workspace";

type TimelineWorkspaceControlsProps = {
  filters: TimelineWorkspaceFilters;
  totalCount: number;
  visibleCount: number;
  hasActiveFilters: boolean;
  onChange: (updates: Partial<TimelineWorkspaceFilters>) => void;
  onReset: () => void;
};

export function TimelineWorkspaceControls({
  filters,
  totalCount,
  visibleCount,
  hasActiveFilters,
  onChange,
  onReset,
}: TimelineWorkspaceControlsProps) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
            Timeline filters
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Showing {visibleCount} of {totalCount} events from the active project.
          </p>
        </div>

        <button
          type="button"
          onClick={onReset}
          disabled={!hasActiveFilters}
          className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:border-zinc-100 disabled:text-zinc-400"
        >
          Reset filters
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Field label="Search">
          <input
            value={filters.search}
            onChange={(event) => onChange({ search: event.target.value })}
            placeholder="Search title, summary, IDs, causes..."
            className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-400"
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
        className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-400"
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
