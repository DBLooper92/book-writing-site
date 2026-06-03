"use client";

import { useEffect, useState } from "react";
import type { AppAuthUser } from "@/types/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { getGovernmentsForProject } from "@/lib/data/governments";
import type { UserProject } from "@/lib/data/projects";
import type { Government } from "@/types/government";

type UseGovernmentsResult = {
  governments: Government[];
  loading: boolean;
  error: string | null;
  user: AppAuthUser | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type GovernmentsState = {
  key: string | null;
  governments: Government[];
  error: string | null;
};

export function useGovernments(): UseGovernmentsResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<GovernmentsState>({
    key: null,
    governments: [],
    error: null,
  });
  const queryKey = uid && activeProjectId ? `${uid}:${activeProjectId}` : null;

  useEffect(() => {
    let cancelled = false;

    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    void getGovernmentsForProject(uid, activeProjectId)
      .then((nextGovernments) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          governments: nextGovernments,
          error: null,
        });
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          governments: [],
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
    governments: matchesCurrentQuery ? state.governments : [],
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
    error instanceof Error ? error.message : "Unable to load governments for the active project."
  );
}


