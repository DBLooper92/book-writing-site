"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import type { UserProject } from "@/lib/firebase/projects";
import { observeScenesForProject } from "@/lib/firebase/scenes";
import type { Scene } from "@/types/scene";

type UseScenesResult = {
  scenes: Scene[];
  loading: boolean;
  error: string | null;
  user: User | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type ScenesState = {
  key: string | null;
  scenes: Scene[];
  error: string | null;
};

export function useScenes(): UseScenesResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<ScenesState>({
    key: null,
    scenes: [],
    error: null,
  });
  const queryKey = uid && activeProjectId ? `${uid}:${activeProjectId}` : null;

  useEffect(() => {
    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    return observeScenesForProject(
      uid,
      activeProjectId,
      (nextScenes) => {
        setState({
          key: queryKey,
          scenes: nextScenes,
          error: null,
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          scenes: [],
          error: getErrorMessage(nextError),
        });
      }
    );
  }, [activeProjectId, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    scenes: matchesCurrentQuery ? state.scenes : [],
    loading,
    error: matchesCurrentQuery ? state.error : null,
    user,
    uid,
    activeProjectId,
    activeProject,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to load scenes for the active project.";
}
