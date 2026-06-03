"use client";

import { useEffect, useState } from "react";
import type { AppAuthUser } from "@/types/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import type { UserProject } from "@/lib/data/projects";
import { getTimelineEventById } from "@/lib/data/timeline-events";
import type { TimelineEvent } from "@/types/timeline-event";

type UseTimelineEventResult = {
  timelineEvent: TimelineEvent | null;
  loading: boolean;
  error: string | null;
  user: AppAuthUser | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type TimelineEventState = {
  key: string | null;
  timelineEvent: TimelineEvent | null;
  error: string | null;
};

export function useTimelineEvent(timelineEventId: string | null): UseTimelineEventResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<TimelineEventState>({
    key: null,
    timelineEvent: null,
    error: null,
  });
  const queryKey =
    uid && activeProjectId && timelineEventId
      ? `${uid}:${activeProjectId}:${timelineEventId}`
      : null;

  useEffect(() => {
    let cancelled = false;

    if (!queryKey || !uid || !activeProjectId || !timelineEventId) {
      return;
    }

    void getTimelineEventById(uid, activeProjectId, timelineEventId)
      .then((nextTimelineEvent) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          timelineEvent: nextTimelineEvent,
          error: nextTimelineEvent ? null : "Timeline event not found in the active project.",
        });
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          timelineEvent: null,
          error: getErrorMessage(nextError),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [activeProjectId, queryKey, timelineEventId, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    timelineEvent: matchesCurrentQuery ? state.timelineEvent : null,
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
    : "Unable to load this timeline event from the active project.";
}


