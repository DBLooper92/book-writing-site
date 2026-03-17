"use client";

import { useEffect, useState } from "react";

import {
  observeActiveProjectId,
  observeUserProjects,
  type UserProject,
} from "@/lib/firebase/projects";

type UseUserProjectsResult = {
  projects: UserProject[];
  activeProjectId: string | null;
  loading: boolean;
};

type UserProjectsState = {
  uid: string | null;
  projects: UserProject[];
  activeProjectId: string | null;
  projectsReady: boolean;
  activeReady: boolean;
};

export function useUserProjects(uid: string | null): UseUserProjectsResult {
  const [state, setState] = useState<UserProjectsState>({
    uid: null,
    projects: [],
    activeProjectId: null,
    projectsReady: false,
    activeReady: false,
  });

  useEffect(() => {
    if (!uid) {
      return;
    }

    const unsubscribeProjects = observeUserProjects(uid, (nextProjects) => {
      setState((current) => ({
        uid,
        projects: nextProjects,
        activeProjectId:
          current.uid === uid ? current.activeProjectId : null,
        projectsReady: true,
        activeReady: current.uid === uid ? current.activeReady : false,
      }));
    });

    const unsubscribeActive = observeActiveProjectId(uid, (nextProjectId) => {
      setState((current) => ({
        uid,
        projects: current.uid === uid ? current.projects : [],
        activeProjectId: nextProjectId,
        projectsReady: current.uid === uid ? current.projectsReady : false,
        activeReady: true,
      }));
    });

    return () => {
      unsubscribeProjects();
      unsubscribeActive();
    };
  }, [uid]);

  const matchesCurrentUser = state.uid === uid;

  return {
    projects: uid && matchesCurrentUser ? state.projects : [],
    activeProjectId: uid && matchesCurrentUser ? state.activeProjectId : null,
    loading: uid ? !matchesCurrentUser || !state.projectsReady || !state.activeReady : false,
  };
}
