"use client";

import { useEffect, useState } from "react";
import type { AppAuthUser } from "@/types/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { getRetconsForProject } from "@/lib/data/retcons";
import type { UserProject } from "@/lib/data/projects";
import type { Retcon } from "@/types/retcon";

type UseRetconsResult = {
  retcons: Retcon[];
  loading: boolean;
  error: string | null;
  user: AppAuthUser | null;
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
    let cancelled = false;

    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    void getRetconsForProject(uid, activeProjectId)
      .then((nextRetcons) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          retcons: nextRetcons,
          error: null,
        });
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          retcons: [],
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


