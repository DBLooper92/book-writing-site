"use client";

import { useEffect, useState } from "react";
import type { AppAuthUser } from "@/types/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import type { UserProject } from "@/lib/data/projects";
import { getSceneById } from "@/lib/data/scenes";
import type { Scene } from "@/types/scene";

type UseSceneResult = {
  scene: Scene | null;
  loading: boolean;
  error: string | null;
  user: AppAuthUser | null;
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
    let cancelled = false;

    if (!queryKey || !uid || !activeProjectId || !sceneId) {
      return;
    }

    void getSceneById(uid, activeProjectId, sceneId)
      .then((nextScene) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          scene: nextScene,
          error: nextScene ? null : "Scene not found in the active project.",
        });
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          scene: null,
          error: getErrorMessage(nextError),
        });
      });

    return () => {
      cancelled = true;
    };
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
