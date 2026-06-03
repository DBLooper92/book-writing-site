"use client";

import { useEffect, useState } from "react";
import type { AppAuthUser } from "@/types/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { getLanguageById } from "@/lib/data/languages";
import type { UserProject } from "@/lib/data/projects";
import type { Language } from "@/types/language";

type UseLanguageResult = {
  language: Language | null;
  loading: boolean;
  error: string | null;
  user: AppAuthUser | null;
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
    let cancelled = false;

    if (!queryKey || !uid || !activeProjectId || !languageId) {
      return;
    }

    void getLanguageById(uid, activeProjectId, languageId)
      .then((nextLanguage) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          language: nextLanguage,
          error: nextLanguage ? null : "Language not found in the active project.",
        });
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          language: null,
          error: getErrorMessage(nextError),
        });
      });

    return () => {
      cancelled = true;
    };
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


