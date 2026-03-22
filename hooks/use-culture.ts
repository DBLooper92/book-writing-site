"use client";

import { useEffect, useState } from "react";
import type { AppAuthUser } from "@/types/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { getCultureById } from "@/lib/data/cultures";
import type { UserProject } from "@/lib/data/projects";
import type { Culture } from "@/types/culture";

type UseCultureResult = {
  culture: Culture | null;
  loading: boolean;
  error: string | null;
  user: AppAuthUser | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type CultureState = {
  key: string | null;
  culture: Culture | null;
  error: string | null;
};

export function useCulture(cultureId: string | null): UseCultureResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<CultureState>({
    key: null,
    culture: null,
    error: null,
  });
  const queryKey =
    uid && activeProjectId && cultureId ? `${uid}:${activeProjectId}:${cultureId}` : null;

  useEffect(() => {
    let cancelled = false;

    if (!queryKey || !uid || !activeProjectId || !cultureId) {
      return;
    }

    void getCultureById(uid, activeProjectId, cultureId)
      .then((nextCulture) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          culture: nextCulture,
          error: nextCulture ? null : "Culture not found in the active project.",
        });
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          culture: null,
          error: getErrorMessage(nextError),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [activeProjectId, cultureId, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    culture: matchesCurrentQuery ? state.culture : null,
    loading,
    error: matchesCurrentQuery ? state.error : null,
    user,
    uid,
    activeProjectId,
    activeProject,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to load this culture from the active project.";
}
