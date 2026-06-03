"use client";

import { useEffect, useState } from "react";
import type { AppAuthUser } from "@/types/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { getGovernmentById } from "@/lib/data/governments";
import type { UserProject } from "@/lib/data/projects";
import type { Government } from "@/types/government";

type UseGovernmentResult = {
  government: Government | null;
  loading: boolean;
  error: string | null;
  user: AppAuthUser | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type GovernmentState = {
  key: string | null;
  government: Government | null;
  error: string | null;
};

export function useGovernment(governmentId: string | null): UseGovernmentResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<GovernmentState>({
    key: null,
    government: null,
    error: null,
  });
  const queryKey =
    uid && activeProjectId && governmentId
      ? `${uid}:${activeProjectId}:${governmentId}`
      : null;

  useEffect(() => {
    let cancelled = false;

    if (!queryKey || !uid || !activeProjectId || !governmentId) {
      return;
    }

    void getGovernmentById(uid, activeProjectId, governmentId)
      .then((nextGovernment) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          government: nextGovernment,
          error: nextGovernment ? null : "Government not found in the active project.",
        });
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          government: null,
          error: getErrorMessage(nextError),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [activeProjectId, governmentId, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    government: matchesCurrentQuery ? state.government : null,
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
      : "Unable to load this government from the active project."
  );
}


