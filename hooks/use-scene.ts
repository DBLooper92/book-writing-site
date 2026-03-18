"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import type { UserProject } from "@/lib/firebase/projects";
import { observeSceneById } from "@/lib/firebase/scenes";
import type { Scene } from "@/types/scene";

type UseSceneResult = {
  scene: Scene | null;
  loading: boolean;
  error: string | null;
  user: User | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type SceneState = {
  key: string | null;
  scene: Scene | null;
  error: string | null;
};

export function useScene(sceneId: string | null): UseSceneResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<SceneState>({
    key: null,
    scene: null,
    error: null,
  });
  const queryKey =
    uid && activeProjectId && sceneId ? `${uid}:${activeProjectId}:${sceneId}` : null;

  useEffect(() => {
    if (!queryKey || !uid || !activeProjectId || !sceneId) {
      return;
    }

    return observeSceneById(
      uid,
      activeProjectId,
      sceneId,
      (nextScene) => {
        setState({
          key: queryKey,
          scene: nextScene,
          error: nextScene ? null : "Scene not found in the active project.",
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          scene: null,
          error: getErrorMessage(nextError),
        });
      }
    );
  }, [activeProjectId, queryKey, sceneId, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    scene: matchesCurrentQuery ? state.scene : null,
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
    : "Unable to load this scene from the active project.";
}
