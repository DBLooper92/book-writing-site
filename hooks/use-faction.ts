"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { observeFactionById } from "@/lib/firebase/factions";
import type { UserProject } from "@/lib/firebase/projects";
import type { Faction } from "@/types/faction";

type UseFactionResult = {
  faction: Faction | null;
  loading: boolean;
  error: string | null;
  user: User | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type FactionState = {
  key: string | null;
  faction: Faction | null;
  error: string | null;
};

export function useFaction(factionId: string | null): UseFactionResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<FactionState>({
    key: null,
    faction: null,
    error: null,
  });
  const queryKey =
    uid && activeProjectId && factionId ? `${uid}:${activeProjectId}:${factionId}` : null;

  useEffect(() => {
    if (!queryKey || !uid || !activeProjectId || !factionId) {
      return;
    }

    return observeFactionById(
      uid,
      activeProjectId,
      factionId,
      (nextFaction) => {
        setState({
          key: queryKey,
          faction: nextFaction,
          error: nextFaction ? null : "Faction not found in the active project.",
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          faction: null,
          error: getErrorMessage(nextError),
        });
      }
    );
  }, [activeProjectId, factionId, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    faction: matchesCurrentQuery ? state.faction : null,
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
    error instanceof Error ? error.message : "Unable to load this faction from the active project."
  );
}
