"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { observePlotThreadById } from "@/lib/firebase/plot-threads";
import type { UserProject } from "@/lib/firebase/projects";
import type { PlotThread } from "@/types/plot-thread";

type UsePlotThreadResult = {
  plotThread: PlotThread | null;
  loading: boolean;
  error: string | null;
  user: User | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type PlotThreadState = {
  key: string | null;
  plotThread: PlotThread | null;
  error: string | null;
};

export function usePlotThread(plotThreadId: string | null): UsePlotThreadResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<PlotThreadState>({
    key: null,
    plotThread: null,
    error: null,
  });
  const queryKey =
    uid && activeProjectId && plotThreadId
      ? `${uid}:${activeProjectId}:${plotThreadId}`
      : null;

  useEffect(() => {
    if (!queryKey || !uid || !activeProjectId || !plotThreadId) {
      return;
    }

    return observePlotThreadById(
      uid,
      activeProjectId,
      plotThreadId,
      (nextPlotThread) => {
        setState({
          key: queryKey,
          plotThread: nextPlotThread,
          error: nextPlotThread ? null : "Plot thread not found in the active project.",
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          plotThread: null,
          error: getErrorMessage(nextError),
        });
      }
    );
  }, [activeProjectId, plotThreadId, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    plotThread: matchesCurrentQuery ? state.plotThread : null,
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
      : "Unable to load this plot thread from the active project."
  );
}
