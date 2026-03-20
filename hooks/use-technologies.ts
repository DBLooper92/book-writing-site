"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { observeTechnologiesForProject } from "@/lib/firebase/technologies";
import type { UserProject } from "@/lib/firebase/projects";
import type { Technology } from "@/types/technology";

type UseTechnologiesResult = {
  technologies: Technology[];
  loading: boolean;
  error: string | null;
  user: User | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type TechnologyListState = {
  key: string | null;
  technologies: Technology[];
  error: string | null;
};

export function useTechnologies(): UseTechnologiesResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<TechnologyListState>({
    key: null,
    technologies: [],
    error: null,
  });
  const queryKey = uid && activeProjectId ? `${uid}:${activeProjectId}` : null;

  useEffect(() => {
    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    return observeTechnologiesForProject(
      uid,
      activeProjectId,
      (nextTechnologies) => {
        setState({
          key: queryKey,
          technologies: nextTechnologies,
          error: null,
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          technologies: [],
          error: getErrorMessage(nextError),
        });
      }
    );
  }, [activeProjectId, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    technologies: matchesCurrentQuery ? state.technologies : [],
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
    : "Unable to load technologies for the active project.";
}
