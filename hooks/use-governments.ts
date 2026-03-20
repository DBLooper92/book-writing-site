"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { observeGovernmentsForProject } from "@/lib/firebase/governments";
import type { UserProject } from "@/lib/firebase/projects";
import type { Government } from "@/types/government";

type UseGovernmentsResult = {
  governments: Government[];
  loading: boolean;
  error: string | null;
  user: User | null;
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
    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    return observeGovernmentsForProject(
      uid,
      activeProjectId,
      (nextGovernments) => {
        setState({
          key: queryKey,
          governments: nextGovernments,
          error: null,
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          governments: [],
          error: getErrorMessage(nextError),
        });
      }
    );
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
