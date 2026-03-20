"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { observeTechnologyById } from "@/lib/firebase/technologies";
import type { UserProject } from "@/lib/firebase/projects";
import type { Technology } from "@/types/technology";

type UseTechnologyResult = {
  technology: Technology | null;
  loading: boolean;
  error: string | null;
  user: User | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type TechnologyState = {
  key: string | null;
  technology: Technology | null;
  error: string | null;
};

export function useTechnology(technologyId: string | null): UseTechnologyResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<TechnologyState>({
    key: null,
    technology: null,
    error: null,
  });
  const queryKey =
    uid && activeProjectId && technologyId ? `${uid}:${activeProjectId}:${technologyId}` : null;

  useEffect(() => {
    if (!queryKey || !uid || !activeProjectId || !technologyId) {
      return;
    }

    return observeTechnologyById(
      uid,
      activeProjectId,
      technologyId,
      (nextTechnology) => {
        setState({
          key: queryKey,
          technology: nextTechnology,
          error: nextTechnology ? null : "Technology not found in the active project.",
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          technology: null,
          error: getErrorMessage(nextError),
        });
      }
    );
  }, [activeProjectId, queryKey, technologyId, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    technology: matchesCurrentQuery ? state.technology : null,
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
    : "Unable to load this technology from the active project.";
}
