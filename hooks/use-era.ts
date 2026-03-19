"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { observeEraById } from "@/lib/firebase/eras";
import type { UserProject } from "@/lib/firebase/projects";
import type { Era } from "@/types/era";

type UseEraResult = {
  era: Era | null;
  loading: boolean;
  error: string | null;
  user: User | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type EraState = {
  key: string | null;
  era: Era | null;
  error: string | null;
};

export function useEra(eraId: string | null): UseEraResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<EraState>({
    key: null,
    era: null,
    error: null,
  });
  const queryKey = uid && activeProjectId && eraId ? `${uid}:${activeProjectId}:${eraId}` : null;

  useEffect(() => {
    if (!queryKey || !uid || !activeProjectId || !eraId) {
      return;
    }

    return observeEraById(
      uid,
      activeProjectId,
      eraId,
      (nextEra) => {
        setState({
          key: queryKey,
          era: nextEra,
          error: nextEra ? null : "Era not found in the active project.",
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          era: null,
          error: getErrorMessage(nextError),
        });
      }
    );
  }, [activeProjectId, eraId, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    era: matchesCurrentQuery ? state.era : null,
    loading,
    error: matchesCurrentQuery ? state.error : null,
    user,
    uid,
    activeProjectId,
    activeProject,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to load this era from the active project.";
}
