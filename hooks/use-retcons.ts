"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { observeRetconsForProject } from "@/lib/firebase/retcons";
import type { UserProject } from "@/lib/firebase/projects";
import type { Retcon } from "@/types/retcon";

type UseRetconsResult = {
  retcons: Retcon[];
  loading: boolean;
  error: string | null;
  user: User | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type RetconsState = {
  key: string | null;
  retcons: Retcon[];
  error: string | null;
};

export function useRetcons(): UseRetconsResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<RetconsState>({
    key: null,
    retcons: [],
    error: null,
  });
  const queryKey = uid && activeProjectId ? `${uid}:${activeProjectId}` : null;

  useEffect(() => {
    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    return observeRetconsForProject(
      uid,
      activeProjectId,
      (nextRetcons) => {
        setState({
          key: queryKey,
          retcons: nextRetcons,
          error: null,
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          retcons: [],
          error: getErrorMessage(nextError),
        });
      }
    );
  }, [activeProjectId, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    retcons: matchesCurrentQuery ? state.retcons : [],
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
    : "Unable to load retcons for the active project.";
}
