"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { observeErasForProject } from "@/lib/firebase/eras";
import type { UserProject } from "@/lib/firebase/projects";
import type { Era } from "@/types/era";

type UseErasResult = {
  eras: Era[];
  loading: boolean;
  error: string | null;
  user: User | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type ErasState = {
  key: string | null;
  eras: Era[];
  error: string | null;
};

export function useEras(): UseErasResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<ErasState>({
    key: null,
    eras: [],
    error: null,
  });
  const queryKey = uid && activeProjectId ? `${uid}:${activeProjectId}` : null;

  useEffect(() => {
    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    return observeErasForProject(
      uid,
      activeProjectId,
      (nextEras) => {
        setState({
          key: queryKey,
          eras: nextEras,
          error: null,
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          eras: [],
          error: getErrorMessage(nextError),
        });
      }
    );
  }, [activeProjectId, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    eras: matchesCurrentQuery ? state.eras : [],
    loading,
    error: matchesCurrentQuery ? state.error : null,
    user,
    uid,
    activeProjectId,
    activeProject,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to load eras for the active project.";
}
