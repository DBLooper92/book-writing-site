"use client";

import { useEffect, useState } from "react";
import type { AppAuthUser } from "@/types/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { getRetconById } from "@/lib/data/retcons";
import type { UserProject } from "@/lib/data/projects";
import type { Retcon } from "@/types/retcon";

type UseRetconResult = {
  retcon: Retcon | null;
  loading: boolean;
  error: string | null;
  user: AppAuthUser | null;
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
    let cancelled = false;

    if (!queryKey || !uid || !activeProjectId || !retconId) {
      return;
    }

    void getRetconById(uid, activeProjectId, retconId)
      .then((nextRetcon) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          retcon: nextRetcon,
          error: nextRetcon ? null : "Retcon not found in the active project.",
        });
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          retcon: null,
          error: getErrorMessage(nextError),
        });
      });

    return () => {
      cancelled = true;
    };
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


