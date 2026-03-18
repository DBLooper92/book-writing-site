"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import type { UserProject } from "@/lib/firebase/projects";
import { observeTimelineEventsForProject } from "@/lib/firebase/timeline-events";
import type { TimelineEvent } from "@/types/timeline-event";

type UseTimelineEventsResult = {
  timelineEvents: TimelineEvent[];
  loading: boolean;
  error: string | null;
  user: User | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type TimelineEventsState = {
  key: string | null;
  timelineEvents: TimelineEvent[];
  error: string | null;
};

export function useTimelineEvents(): UseTimelineEventsResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<TimelineEventsState>({
    key: null,
    timelineEvents: [],
    error: null,
  });
  const queryKey = uid && activeProjectId ? `${uid}:${activeProjectId}` : null;

  useEffect(() => {
    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    return observeTimelineEventsForProject(
      uid,
      activeProjectId,
      (nextTimelineEvents) => {
        setState({
          key: queryKey,
          timelineEvents: nextTimelineEvents,
          error: null,
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          timelineEvents: [],
          error: getErrorMessage(nextError),
        });
      }
    );
  }, [activeProjectId, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    timelineEvents: matchesCurrentQuery ? state.timelineEvents : [],
    loading,
    error: matchesCurrentQuery ? state.error : null,
    user,
    uid,
    activeProjectId,
    activeProject,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to load timeline events for the active project.";
}
