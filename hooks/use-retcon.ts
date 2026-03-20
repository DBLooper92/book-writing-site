"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { observeRetconById } from "@/lib/firebase/retcons";
import type { UserProject } from "@/lib/firebase/projects";
import type { Retcon } from "@/types/retcon";

type UseRetconResult = {
  retcon: Retcon | null;
  loading: boolean;
  error: string | null;
  user: User | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type RetconState = {
  key: string | null;
  retcon: Retcon | null;
  error: string | null;
};

export function useRetcon(retconId: string | null): UseRetconResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<RetconState>({
    key: null,
    retcon: null,
    error: null,
  });
  const queryKey =
    uid && activeProjectId && retconId ? `${uid}:${activeProjectId}:${retconId}` : null;

  useEffect(() => {
    if (!queryKey || !uid || !activeProjectId || !retconId) {
      return;
    }

    return observeRetconById(
      uid,
      activeProjectId,
      retconId,
      (nextRetcon) => {
        setState({
          key: queryKey,
          retcon: nextRetcon,
          error: nextRetcon ? null : "Retcon not found in the active project.",
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          retcon: null,
          error: getErrorMessage(nextError),
        });
      }
    );
  }, [activeProjectId, queryKey, retconId, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    retcon: matchesCurrentQuery ? state.retcon : null,
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
    : "Unable to load this retcon from the active project.";
}
