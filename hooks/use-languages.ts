"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { observeLanguagesForProject } from "@/lib/firebase/languages";
import type { UserProject } from "@/lib/firebase/projects";
import type { Language } from "@/types/language";

type UseLanguagesResult = {
  languages: Language[];
  loading: boolean;
  error: string | null;
  user: User | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type LanguagesState = {
  key: string | null;
  languages: Language[];
  error: string | null;
};

export function useLanguages(): UseLanguagesResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<LanguagesState>({
    key: null,
    languages: [],
    error: null,
  });
  const queryKey = uid && activeProjectId ? `${uid}:${activeProjectId}` : null;

  useEffect(() => {
    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    return observeLanguagesForProject(
      uid,
      activeProjectId,
      (nextLanguages) => {
        setState({
          key: queryKey,
          languages: nextLanguages,
          error: null,
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          languages: [],
          error: getErrorMessage(nextError),
        });
      }
    );
  }, [activeProjectId, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    languages: matchesCurrentQuery ? state.languages : [],
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
    error instanceof Error ? error.message : "Unable to load languages for the active project."
  );
}
