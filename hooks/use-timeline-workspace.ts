"use client";

import { useState } from "react";

import { useTimelineEvents } from "@/hooks/use-timeline-events";
import {
  buildTimelineWorkspaceModel,
  createEmptyTimelineWorkspaceFilters,
  hasActiveTimelineWorkspaceFilters,
  type TimelineWorkspaceFilters,
} from "@/lib/timeline/workspace";

export function useTimelineWorkspace() {
  const timelineEventsState = useTimelineEvents();
  const [filters, setFilters] = useState<TimelineWorkspaceFilters>(() =>
    createEmptyTimelineWorkspaceFilters()
  );
  const workspace = buildTimelineWorkspaceModel(timelineEventsState.timelineEvents, filters);

  function updateFilters(updates: Partial<TimelineWorkspaceFilters>) {
    setFilters((current) => ({
      ...current,
      ...updates,
    }));
  }

  function resetFilters() {
    setFilters(createEmptyTimelineWorkspaceFilters());
  }

  return {
    ...timelineEventsState,
    filters,
    updateFilters,
    resetFilters,
    hasActiveFilters: hasActiveTimelineWorkspaceFilters(filters),
    workspace,
  };
}
