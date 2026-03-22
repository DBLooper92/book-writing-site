"use client";

import { useEffect, useState } from "react";
import type { AppAuthUser } from "@/types/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { getFactionById } from "@/lib/data/factions";
import type { UserProject } from "@/lib/data/projects";
import type { Faction } from "@/types/faction";

type UseFactionResult = {
  faction: Faction | null;
  loading: boolean;
  error: string | null;
  user: AppAuthUser | null;
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
    let cancelled = false;

    if (!queryKey || !uid || !activeProjectId || !factionId) {
      return;
    }

    void getFactionById(uid, activeProjectId, factionId)
      .then((nextFaction) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          faction: nextFaction,
          error: nextFaction ? null : "Faction not found in the active project.",
        });
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          faction: null,
          error: getErrorMessage(nextError),
        });
      });

    return () => {
      cancelled = true;
    };
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
  return error instanceof Error ? error.message : "Unable to load this faction from the active project.";
}
