"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import type { UserProject } from "@/lib/firebase/projects";
import { observeCharactersForProject } from "@/lib/firebase/characters";
import type { Character } from "@/types/character";

type UseCharactersResult = {
  characters: Character[];
  loading: boolean;
  error: string | null;
  user: User | null;
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
    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    return observeCharactersForProject(
      uid,
      activeProjectId,
      (nextCharacters) => {
        setState({
          key: queryKey,
          characters: nextCharacters,
          error: null,
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          characters: [],
          error: getErrorMessage(nextError),
        });
      }
    );
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
  return (
    error instanceof Error
      ? error.message
      : "Unable to load characters for the active project."
  );
}
