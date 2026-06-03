"use client";

import { useEffect, useState } from "react";
import type { AppAuthUser } from "@/types/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { getCulturesForProject } from "@/lib/data/cultures";
import type { UserProject } from "@/lib/data/projects";
import type { Culture } from "@/types/culture";

type UseCulturesResult = {
  cultures: Culture[];
  loading: boolean;
  error: string | null;
  user: AppAuthUser | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type CulturesState = {
  key: string | null;
  cultures: Culture[];
  error: string | null;
};

export function useCultures(): UseCulturesResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<CulturesState>({
    key: null,
    cultures: [],
    error: null,
  });
  const queryKey = uid && activeProjectId ? `${uid}:${activeProjectId}` : null;

  useEffect(() => {
    let cancelled = false;

    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    void getCulturesForProject(uid, activeProjectId)
      .then((nextCultures) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          cultures: nextCultures,
          error: null,
        });
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          cultures: [],
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
    cultures: matchesCurrentQuery ? state.cultures : [],
    loading,
    error: matchesCurrentQuery ? state.error : null,
    user,
    uid,
    activeProjectId,
    activeProject,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to load cultures for the active project.";
}
