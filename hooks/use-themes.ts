"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import type { UserProject } from "@/lib/firebase/projects";
import { observeThemesForProject } from "@/lib/firebase/themes";
import type { Theme } from "@/types/theme";

type UseThemesResult = {
  themes: Theme[];
  loading: boolean;
  error: string | null;
  user: User | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type ThemesState = {
  key: string | null;
  themes: Theme[];
  error: string | null;
};

export function useThemes(): UseThemesResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<ThemesState>({
    key: null,
    themes: [],
    error: null,
  });
  const queryKey = uid && activeProjectId ? `${uid}:${activeProjectId}` : null;

  useEffect(() => {
    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    return observeThemesForProject(
      uid,
      activeProjectId,
      (nextThemes) => {
        setState({
          key: queryKey,
          themes: nextThemes,
          error: null,
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          themes: [],
          error: getErrorMessage(nextError),
        });
      }
    );
  }, [activeProjectId, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    themes: matchesCurrentQuery ? state.themes : [],
    loading,
    error: matchesCurrentQuery ? state.error : null,
    user,
    uid,
    activeProjectId,
    activeProject,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to load themes for the active project.";
}
