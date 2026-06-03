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
  activeProjectId: string | null;
  loading: boolean;
  projects: UserProject[];
  uid: string | null;
};

export function useUserProjects(uid: string | null): UseUserProjectsResult {
  const [state, setState] = useState<UserProjectsState>(() => getInitialUserProjectsState());
  updateUserProjectsDebug({
    activeProjectId: state.activeProjectId,
    loading: state.loading,
    projects: state.projects.map((project) => project.id),
    uid: state.uid,
    phase: "initial-render",
  });

  useEffect(() => {
    if (!uid) {
      return;
    }

    updateUserProjectsDebug({
      phase: "effect-start",
      uid,
    });

    if (typeof window === "undefined" || !window.bookBible?.project?.subscribe) {
      return;
    }

    let cancelled = false;
    const currentUid = uid;

    async function loadProjects() {
      updateUserProjectsDebug({
        phase: "load-start",
        uid: currentUid,
      });
      setState((current) => ({
        activeProjectId: current.activeProjectId,
        loading: true,
        projects: current.projects,
        uid: currentUid,
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
          activeProjectId,
          loading: false,
          projects,
          uid: currentUid,
        });
        updateUserProjectsDebug({
          activeProjectId,
          loading: false,
          phase: "load-done",
          projects: projects.map((project) => project.id),
          uid: currentUid,
        });
      } catch (nextError) {
        if (cancelled) {
          return;
        }

        updateUserProjectsDebug({
          error: nextError instanceof Error ? nextError.message : String(nextError),
          phase: "load-error",
          uid: currentUid,
        });
        setState({
          activeProjectId: null,
          loading: false,
          projects: [],
          uid: currentUid,
        });
      }
    }

    void loadProjects();

    let unsubscribeProject = () => {};
    try {
      unsubscribeProject = window.bookBible.project.subscribe(() => {
        updateUserProjectsDebug({
          phase: "subscription-fired",
          uid: currentUid,
        });
        void loadProjects();
      });
    } catch {
      updateUserProjectsDebug({
        phase: "subscribe-failed",
        uid: currentUid,
      });
      return;
    }

    const handleProjectsChanged = () => {
      void loadProjects();
    };

    window.addEventListener(PROJECTS_CHANGED_EVENT, handleProjectsChanged);

    return () => {
      cancelled = true;
      unsubscribeProject();
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

function updateUserProjectsDebug(payload: Record<string, unknown>) {
  if (typeof window === "undefined") {
    return;
  }

  const debugState = (window as Window & { __bookBibleDebug?: Record<string, unknown> }).__bookBibleDebug ?? {};
  (window as Window & { __bookBibleDebug?: Record<string, unknown> }).__bookBibleDebug = {
    ...debugState,
    userProjects: {
      ...(typeof debugState.userProjects === "object" && debugState.userProjects
        ? (debugState.userProjects as Record<string, unknown>)
        : {}),
      ...payload,
    },
  };
}

function getInitialUserProjectsState(): UserProjectsState {
  return {
    activeProjectId: null,
    loading: false,
    projects: [],
    uid: null,
  };
}
