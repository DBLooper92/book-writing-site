"use client";

import { useEffect, useState } from "react";
import type { AppAuthUser } from "@/types/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { getPlotThreadsForProject } from "@/lib/data/plot-threads";
import type { UserProject } from "@/lib/data/projects";
import type { PlotThread } from "@/types/plot-thread";

type UsePlotThreadsResult = {
  plotThreads: PlotThread[];
  loading: boolean;
  error: string | null;
  user: AppAuthUser | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type PlotThreadsState = {
  key: string | null;
  plotThreads: PlotThread[];
  error: string | null;
};

export function usePlotThreads(): UsePlotThreadsResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<PlotThreadsState>({
    key: null,
    plotThreads: [],
    error: null,
  });
  const queryKey = uid && activeProjectId ? `${uid}:${activeProjectId}` : null;

  useEffect(() => {
    let cancelled = false;

    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    void getPlotThreadsForProject(uid, activeProjectId)
      .then((nextPlotThreads) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          plotThreads: nextPlotThreads,
          error: null,
        });
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          plotThreads: [],
          error: getErrorMessage(nextError),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [activeProjectId, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    plotThreads: matchesCurrentQuery ? state.plotThreads : [],
    loading,
    error: matchesCurrentQuery ? state.error : null,
    user,
    uid,
    activeProjectId,
    activeProject,
  };
}

function getErrorMessage(error: unknown) {
  return (
    error instanceof Error
      ? error.message
      : "Unable to load plot threads for the active project."
  );
}


