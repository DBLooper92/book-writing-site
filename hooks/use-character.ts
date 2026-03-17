"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { observeCharacterById } from "@/lib/firebase/characters";
import type { UserProject } from "@/lib/firebase/projects";
import type { Character } from "@/types/character";

type UseCharacterResult = {
  character: Character | null;
  loading: boolean;
  error: string | null;
  user: User | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type CharacterState = {
  key: string | null;
  character: Character | null;
  error: string | null;
};

export function useCharacter(characterId: string | null): UseCharacterResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<CharacterState>({
    key: null,
    character: null,
    error: null,
  });
  const queryKey =
    uid && activeProjectId && characterId
      ? `${uid}:${activeProjectId}:${characterId}`
      : null;

  useEffect(() => {
    if (!queryKey || !uid || !activeProjectId || !characterId) {
      return;
    }

    return observeCharacterById(
      uid,
      activeProjectId,
      characterId,
      (nextCharacter) => {
        setState({
          key: queryKey,
          character: nextCharacter,
          error: nextCharacter ? null : "Character not found in the active project.",
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          character: null,
          error: getErrorMessage(nextError),
        });
      }
    );
  }, [activeProjectId, characterId, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    character: matchesCurrentQuery ? state.character : null,
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
      : "Unable to load this character from the active project."
  );
}
