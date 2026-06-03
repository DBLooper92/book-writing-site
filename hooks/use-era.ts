"use client";

import { useEffect, useState } from "react";
import type { AppAuthUser } from "@/types/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { getEraById } from "@/lib/data/eras";
import type { UserProject } from "@/lib/data/projects";
import type { Era } from "@/types/era";

type UseEraResult = {
  era: Era | null;
  loading: boolean;
  error: string | null;
  user: AppAuthUser | null;
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
    let cancelled = false;

    if (!queryKey || !uid || !activeProjectId || !eraId) {
      return;
    }

    void getEraById(uid, activeProjectId, eraId)
      .then((nextEra) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          era: nextEra,
          error: nextEra ? null : "Era not found in the active project.",
        });
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          era: null,
          error: getErrorMessage(nextError),
        });
      });

    return () => {
      cancelled = true;
    };
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
