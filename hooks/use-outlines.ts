"use client";

import { useEffect, useState } from "react";
import type { AppAuthUser } from "@/types/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { getOutlinesForProject } from "@/lib/data/outlines";
import type { UserProject } from "@/lib/data/projects";
import type { Outline } from "@/types/outline";

type UseOutlinesResult = {
  outlines: Outline[];
  loading: boolean;
  error: string | null;
  user: AppAuthUser | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type OutlineListState = {
  key: string | null;
  outlines: Outline[];
  error: string | null;
};

export function useOutlines(): UseOutlinesResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<OutlineListState>({
    key: null,
    outlines: [],
    error: null,
  });
  const queryKey = uid && activeProjectId ? `${uid}:${activeProjectId}` : null;

  useEffect(() => {
    let cancelled = false;

    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    void getOutlinesForProject(uid, activeProjectId)
      .then((nextOutlines) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          outlines: nextOutlines,
          error: null,
        });
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          outlines: [],
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
    outlines: matchesCurrentQuery ? state.outlines : [],
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
    : "Unable to load outlines for the active project.";
}


