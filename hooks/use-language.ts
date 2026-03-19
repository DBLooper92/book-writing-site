"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { observeLanguageById } from "@/lib/firebase/languages";
import type { UserProject } from "@/lib/firebase/projects";
import type { Language } from "@/types/language";

type UseLanguageResult = {
  language: Language | null;
  loading: boolean;
  error: string | null;
  user: User | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type LanguageState = {
  key: string | null;
  language: Language | null;
  error: string | null;
};

export function useLanguage(languageId: string | null): UseLanguageResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<LanguageState>({
    key: null,
    language: null,
    error: null,
  });
  const queryKey =
    uid && activeProjectId && languageId ? `${uid}:${activeProjectId}:${languageId}` : null;

  useEffect(() => {
    if (!queryKey || !uid || !activeProjectId || !languageId) {
      return;
    }

    return observeLanguageById(
      uid,
      activeProjectId,
      languageId,
      (nextLanguage) => {
        setState({
          key: queryKey,
          language: nextLanguage,
          error: nextLanguage ? null : "Language not found in the active project.",
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          language: null,
          error: getErrorMessage(nextError),
        });
      }
    );
  }, [activeProjectId, languageId, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    language: matchesCurrentQuery ? state.language : null,
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
    error instanceof Error ? error.message : "Unable to load this language from the active project."
  );
}
