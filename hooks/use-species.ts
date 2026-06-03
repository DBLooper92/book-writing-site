"use client";

import { useEffect, useState } from "react";
import type { AppAuthUser } from "@/types/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import type { UserProject } from "@/lib/data/projects";
import { getSpeciesForProject } from "@/lib/data/species";
import type { Species } from "@/types/species";

type UseSpeciesResult = {
  speciesEntries: Species[];
  loading: boolean;
  error: string | null;
  user: AppAuthUser | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type SpeciesState = {
  key: string | null;
  speciesEntries: Species[];
  error: string | null;
};

export function useSpecies(): UseSpeciesResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<SpeciesState>({
    key: null,
    speciesEntries: [],
    error: null,
  });
  const queryKey = uid && activeProjectId ? `${uid}:${activeProjectId}` : null;

  useEffect(() => {
    let cancelled = false;

    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    void getSpeciesForProject(uid, activeProjectId)
      .then((nextSpeciesEntries) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          speciesEntries: nextSpeciesEntries,
          error: null,
        });
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          speciesEntries: [],
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
    speciesEntries: matchesCurrentQuery ? state.speciesEntries : [],
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
    error instanceof Error ? error.message : "Unable to load species for the active project."
  );
}


