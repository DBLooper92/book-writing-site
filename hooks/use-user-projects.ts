"use client";

import { useEffect, useState } from "react";

import {
  getActiveProjectId,
  listUserProjects,
  type UserProject,
} from "@/lib/data/projects";

const PROJECTS_CHANGED_EVENT = "app:projects-changed";

export function emitProjectsChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(PROJECTS_CHANGED_EVENT));
}

type UseUserProjectsResult = {
  projects: UserProject[];
  activeProjectId: string | null;
  loading: boolean;
};

type UserProjectsState = {
  uid: string | null;
  projects: UserProject[];
  activeProjectId: string | null;
  loading: boolean;
};

export function useUserProjects(uid: string | null): UseUserProjectsResult {
  const [state, setState] = useState<UserProjectsState>({
    uid: null,
    projects: [],
    activeProjectId: null,
    loading: false,
  });

  useEffect(() => {
    if (!uid) {
      return;
    }

    const currentUid = uid;
    let cancelled = false;

    async function loadProjects() {
      setState((current) => ({
        uid: currentUid,
        projects: current.uid === currentUid ? current.projects : [],
        activeProjectId: current.uid === currentUid ? current.activeProjectId : null,
        loading: true,
      }));

      try {
        const [projects, activeProjectId] = await Promise.all([
          listUserProjects(currentUid),
          getActiveProjectId(currentUid),
        ]);

        if (cancelled) {
          return;
        }

        setState({
          uid: currentUid,
          projects,
          activeProjectId,
          loading: false,
        });
      } catch {
        if (cancelled) {
          return;
        }

        setState({
          uid: currentUid,
          projects: [],
          activeProjectId: null,
          loading: false,
        });
      }
    }

    void loadProjects();

    function handleProjectsChanged() {
      void loadProjects();
    }

    window.addEventListener(PROJECTS_CHANGED_EVENT, handleProjectsChanged);

    return () => {
      cancelled = true;
      window.removeEventListener(PROJECTS_CHANGED_EVENT, handleProjectsChanged);
    };
  }, [uid]);

  const matchesCurrentUser = state.uid === uid;

  return {
    projects: uid && matchesCurrentUser ? state.projects : [],
    activeProjectId: uid && matchesCurrentUser ? state.activeProjectId : null,
    loading: uid ? !matchesCurrentUser || state.loading : false,
  };
}

