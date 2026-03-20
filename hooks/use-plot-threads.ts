"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { observePlotThreadsForProject } from "@/lib/firebase/plot-threads";
import type { UserProject } from "@/lib/firebase/projects";
import type { PlotThread } from "@/types/plot-thread";

type UsePlotThreadsResult = {
  plotThreads: PlotThread[];
  loading: boolean;
  error: string | null;
  user: User | null;
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
    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    return observePlotThreadsForProject(
      uid,
      activeProjectId,
      (nextPlotThreads) => {
        setState({
          key: queryKey,
          plotThreads: nextPlotThreads,
          error: null,
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          plotThreads: [],
          error: getErrorMessage(nextError),
        });
      }
    );
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
