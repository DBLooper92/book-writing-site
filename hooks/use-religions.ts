"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { observeReligionsForProject } from "@/lib/firebase/religions";
import type { UserProject } from "@/lib/firebase/projects";
import type { Religion } from "@/types/religion";

type UseReligionsResult = {
  religions: Religion[];
  loading: boolean;
  error: string | null;
  user: User | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type ReligionsState = {
  key: string | null;
  religions: Religion[];
  error: string | null;
};

export function useReligions(): UseReligionsResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<ReligionsState>({
    key: null,
    religions: [],
    error: null,
  });
  const queryKey = uid && activeProjectId ? `${uid}:${activeProjectId}` : null;

  useEffect(() => {
    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    return observeReligionsForProject(
      uid,
      activeProjectId,
      (nextReligions) => {
        setState({
          key: queryKey,
          religions: nextReligions,
          error: null,
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          religions: [],
          error: getErrorMessage(nextError),
        });
      }
    );
  }, [activeProjectId, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    religions: matchesCurrentQuery ? state.religions : [],
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
    error instanceof Error ? error.message : "Unable to load religions for the active project."
  );
}
