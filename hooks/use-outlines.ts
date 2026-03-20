"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { observeOutlinesForProject } from "@/lib/firebase/outlines";
import type { UserProject } from "@/lib/firebase/projects";
import type { Outline } from "@/types/outline";

type UseOutlinesResult = {
  outlines: Outline[];
  loading: boolean;
  error: string | null;
  user: User | null;
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
    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    return observeOutlinesForProject(
      uid,
      activeProjectId,
      (nextOutlines) => {
        setState({
          key: queryKey,
          outlines: nextOutlines,
          error: null,
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          outlines: [],
          error: getErrorMessage(nextError),
        });
      }
    );
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
