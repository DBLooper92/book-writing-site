"use client";

import { useEffect, useState } from "react";
import type { AppAuthUser } from "@/types/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import type { UserProject } from "@/lib/data/projects";
import { getThemeById } from "@/lib/data/themes";
import type { Theme } from "@/types/theme";

type UseThemeResult = {
  theme: Theme | null;
  loading: boolean;
  error: string | null;
  user: AppAuthUser | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type ThemeState = {
  key: string | null;
  theme: Theme | null;
  error: string | null;
};

export function useTheme(themeId: string | null): UseThemeResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<ThemeState>({
    key: null,
    theme: null,
    error: null,
  });
  const queryKey =
    uid && activeProjectId && themeId ? `${uid}:${activeProjectId}:${themeId}` : null;

  useEffect(() => {
    let cancelled = false;

    if (!queryKey || !uid || !activeProjectId || !themeId) {
      return;
    }

    void getThemeById(uid, activeProjectId, themeId)
      .then((nextTheme) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          theme: nextTheme,
          error: nextTheme ? null : "Theme not found in the active project.",
        });
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          theme: null,
          error: getErrorMessage(nextError),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [activeProjectId, queryKey, themeId, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    theme: matchesCurrentQuery ? state.theme : null,
    loading,
    error: matchesCurrentQuery ? state.error : null,
    user,
    uid,
    activeProjectId,
    activeProject,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to load this theme from the active project.";
}
