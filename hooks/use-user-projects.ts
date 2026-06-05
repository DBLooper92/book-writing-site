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
  const [state, setState] = useState<UserProjectsState>(() => getInitialUserProjectsState(uid));
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

    if (typeof window === "undefined") {
      return;
    }

    let cancelled = false;
    const currentUid = uid;
    const syncRefresh = (phase: string) => {
      const syncState = getWindowSyncProjectState();

      if (!syncState || cancelled) {
        return;
      }

      const projects = syncState.recentProjects.map((project) => ({
        id: project.id,
        title: project.title,
        slug: project.id,
        summary: project.missing ? "Project folder is missing." : "Local desktop project.",
        status: project.missing ? "missing" : "active",
      }));

      setState({
        activeProjectId: syncState.currentProject?.id ?? null,
        loading: false,
        projects,
        uid: currentUid,
      });
      console.log("[book-bible:user-projects]", phase, syncState.currentProject?.id ?? null);
      updateUserProjectsDebug({
        activeProjectId: syncState.currentProject?.id ?? null,
        loading: false,
        phase,
        projects: projects.map((project) => project.id),
        uid: currentUid,
      });
    };

    async function loadProjects() {
      updateUserProjectsDebug({
        phase: "load-start",
        uid: currentUid,
      });
      setState((current) => ({
        activeProjectId: current.activeProjectId,
        loading: current.uid === currentUid && Boolean(current.activeProjectId) ? false : true,
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
        console.log("[book-bible:user-projects]", "load-done", activeProjectId);
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

    syncRefresh("sync-refresh");
    void loadProjects();

    let unsubscribeProject = () => {};
    try {
      unsubscribeProject = window.bookBible.project.subscribe(() => {
        updateUserProjectsDebug({
          phase: "subscription-fired",
          uid: currentUid,
        });
        syncRefresh("subscription-sync");
        void loadProjects();
      });
    } catch {
      updateUserProjectsDebug({
        phase: "subscribe-failed",
        uid: currentUid,
      });
    }

    const handleProjectsChanged = () => {
      syncRefresh("projects-changed-sync");
      void loadProjects();
    };

    window.addEventListener(PROJECTS_CHANGED_EVENT, handleProjectsChanged);
    const poller = window.setInterval(() => {
      syncRefresh("poll-sync");
    }, 1000);

    return () => {
      cancelled = true;
      unsubscribeProject();
      window.removeEventListener(PROJECTS_CHANGED_EVENT, handleProjectsChanged);
      window.clearInterval(poller);
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

function getInitialUserProjectsState(uid: string | null): UserProjectsState {
  const bootstrap = getWindowBootstrap();

  if (bootstrap) {
    return {
      activeProjectId: bootstrap.currentProject?.id ?? null,
      loading: false,
      projects: Array.isArray(bootstrap.recentProjects)
        ? bootstrap.recentProjects.map((project) => ({
            id: project.id,
            title: project.title,
            slug: project.id,
            summary: project.missing ? "Project folder is missing." : "Local desktop project.",
            status: project.missing ? "missing" : "active",
          }))
        : [],
      uid,
    };
  }

  const syncState = getWindowSyncProjectState();

  if (syncState) {
    return {
      activeProjectId: syncState.currentProject?.id ?? null,
      loading: false,
      projects: syncState.recentProjects.map((project) => ({
        id: project.id,
        title: project.title,
        slug: project.id,
        summary: project.missing ? "Project folder is missing." : "Local desktop project.",
        status: project.missing ? "missing" : "active",
      })),
      uid,
    };
  }

  return {
    activeProjectId: null,
    loading: false,
    projects: [],
    uid,
  };
}

function getWindowBootstrap() {
  if (typeof window === "undefined") {
    return null;
  }

  return (window as Window & { __bookBibleBootstrap?: {
    currentProject?: { id: string } | null;
    recentProjects?: Array<{
      id: string;
      missing?: boolean;
      title: string;
    }>;
  } }).__bookBibleBootstrap ?? null;
}

function getWindowSyncProjectState() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const currentProject = window.bookBible?.project?.getCurrentSync?.() ?? null;
    const recentProjects = window.bookBible?.launcher?.listRecentProjectsSync?.() ?? [];

    return {
      currentProject,
      recentProjects,
    };
  } catch {
    return null;
  }
}
