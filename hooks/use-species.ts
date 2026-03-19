"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import type { UserProject } from "@/lib/firebase/projects";
import { observeSpeciesForProject } from "@/lib/firebase/species";
import type { Species } from "@/types/species";

type UseSpeciesResult = {
  speciesEntries: Species[];
  loading: boolean;
  error: string | null;
  user: User | null;
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
    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    return observeSpeciesForProject(
      uid,
      activeProjectId,
      (nextSpeciesEntries) => {
        setState({
          key: queryKey,
          speciesEntries: nextSpeciesEntries,
          error: null,
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          speciesEntries: [],
          error: getErrorMessage(nextError),
        });
      }
    );
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
