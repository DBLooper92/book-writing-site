"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import type { UserProject } from "@/lib/firebase/projects";
import { observeSpeciesById } from "@/lib/firebase/species";
import type { Species } from "@/types/species";

type UseSpeciesRecordResult = {
  species: Species | null;
  loading: boolean;
  error: string | null;
  user: User | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type SpeciesRecordState = {
  key: string | null;
  species: Species | null;
  error: string | null;
};

export function useSpeciesRecord(speciesId: string | null): UseSpeciesRecordResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<SpeciesRecordState>({
    key: null,
    species: null,
    error: null,
  });
  const queryKey =
    uid && activeProjectId && speciesId ? `${uid}:${activeProjectId}:${speciesId}` : null;

  useEffect(() => {
    if (!queryKey || !uid || !activeProjectId || !speciesId) {
      return;
    }

    return observeSpeciesById(
      uid,
      activeProjectId,
      speciesId,
      (nextSpecies) => {
        setState({
          key: queryKey,
          species: nextSpecies,
          error: nextSpecies ? null : "Species not found in the active project.",
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          species: null,
          error: getErrorMessage(nextError),
        });
      }
    );
  }, [activeProjectId, queryKey, speciesId, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    species: matchesCurrentQuery ? state.species : null,
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
    error instanceof Error ? error.message : "Unable to load this species from the active project."
  );
}
