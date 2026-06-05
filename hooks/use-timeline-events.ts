"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AppAuthUser } from "@/types/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import type { UserProject } from "@/lib/data/projects";
import { getTimelineEventsForProject } from "@/lib/data/timeline-events";
import type { TimelineEvent } from "@/types/timeline-event";

type UseTimelineEventsResult = {
  timelineEvents: TimelineEvent[];
  loading: boolean;
  error: string | null;
  user: AppAuthUser | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
  refreshing: boolean;
  refreshTimelineEvents: () => Promise<void>;
};

type TimelineEventsState = {
  key: string | null;
  timelineEvents: TimelineEvent[];
  error: string | null;
  loading: boolean;
  refreshing: boolean;
};

export function useTimelineEvents(): UseTimelineEventsResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<TimelineEventsState>({
    key: null,
    timelineEvents: [],
    error: null,
    loading: false,
    refreshing: false,
  });
  const queryKey = uid && activeProjectId ? `${uid}:${activeProjectId}` : null;
  const requestVersionRef = useRef(0);

  const loadTimelineEvents = useCallback(
    async ({ preserveCurrent }: { preserveCurrent: boolean }) => {
      if (!queryKey || !uid || !activeProjectId) {
        setState({
          key: null,
          timelineEvents: [],
          error: null,
          loading: false,
          refreshing: false,
        });
        return;
      }

      const requestVersion = ++requestVersionRef.current;

      setState((current) => {
        const hasCurrentData = current.key === queryKey;
        const shouldPreserveCurrent = preserveCurrent && hasCurrentData;

        return {
          key: queryKey,
          timelineEvents: shouldPreserveCurrent ? current.timelineEvents : [],
          error: null,
          loading: !shouldPreserveCurrent,
          refreshing: shouldPreserveCurrent,
        };
      });

      try {
        const nextTimelineEvents = await getTimelineEventsForProject(uid, activeProjectId);

        if (requestVersion !== requestVersionRef.current) {
          return;
        }

        setState({
          key: queryKey,
          timelineEvents: nextTimelineEvents,
          error: null,
          loading: false,
          refreshing: false,
        });
      } catch (nextError) {
        if (requestVersion !== requestVersionRef.current) {
          return;
        }

        setState((current) => ({
          key: queryKey,
          timelineEvents:
            preserveCurrent && current.key === queryKey ? current.timelineEvents : [],
          error: getErrorMessage(nextError),
          loading: false,
          refreshing: false,
        }));
      }
    },
    [activeProjectId, queryKey, uid]
  );

  useEffect(() => {
    if (!queryKey || !uid || !activeProjectId) {
      requestVersionRef.current += 1;
      setState({
        key: null,
        timelineEvents: [],
        error: null,
        loading: false,
        refreshing: false,
      });
      return;
    }

    void loadTimelineEvents({
      preserveCurrent: false,
    });
  }, [activeProjectId, loadTimelineEvents, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  async function refreshTimelineEvents() {
    await loadTimelineEvents({
      preserveCurrent: true,
    });
  }

  return {
    timelineEvents: matchesCurrentQuery ? state.timelineEvents : [],
    loading,
    error: matchesCurrentQuery ? state.error : null,
    user,
    uid,
    activeProjectId,
    activeProject,
    refreshing: matchesCurrentQuery ? state.refreshing : false,
    refreshTimelineEvents,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to load timeline events for the active project.";
}


