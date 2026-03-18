"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { observeFactionsForProject } from "@/lib/firebase/factions";
import type { UserProject } from "@/lib/firebase/projects";
import type { Faction } from "@/types/faction";

type UseFactionsResult = {
  factions: Faction[];
  loading: boolean;
  error: string | null;
  user: User | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type FactionsState = {
  key: string | null;
  factions: Faction[];
  error: string | null;
};

export function useFactions(): UseFactionsResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<FactionsState>({
    key: null,
    factions: [],
    error: null,
  });
  const queryKey = uid && activeProjectId ? `${uid}:${activeProjectId}` : null;

  useEffect(() => {
    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    return observeFactionsForProject(
      uid,
      activeProjectId,
      (nextFactions) => {
        setState({
          key: queryKey,
          factions: nextFactions,
          error: null,
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          factions: [],
          error: getErrorMessage(nextError),
        });
      }
    );
  }, [activeProjectId, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    factions: matchesCurrentQuery ? state.factions : [],
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
    error instanceof Error ? error.message : "Unable to load factions for the active project."
  );
}
