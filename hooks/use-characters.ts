"use client";

import { useEffect, useState } from "react";
import type { AppAuthUser } from "@/types/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { getCharactersForProject } from "@/lib/data/characters";
import type { UserProject } from "@/lib/data/projects";
import type { Character } from "@/types/character";

type UseCharactersResult = {
  characters: Character[];
  loading: boolean;
  error: string | null;
  user: AppAuthUser | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type CharactersState = {
  key: string | null;
  characters: Character[];
  error: string | null;
};

export function useCharacters(): UseCharactersResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<CharactersState>({
    key: null,
    characters: [],
    error: null,
  });
  const queryKey = uid && activeProjectId ? `${uid}:${activeProjectId}` : null;

  useEffect(() => {
    let cancelled = false;

    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    void getCharactersForProject(uid, activeProjectId)
      .then((nextCharacters) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          characters: nextCharacters,
          error: null,
        });
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          characters: [],
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
    characters: matchesCurrentQuery ? state.characters : [],
    loading,
    error: matchesCurrentQuery ? state.error : null,
    user,
    uid,
    activeProjectId,
    activeProject,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to load characters for the active project.";
}
