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
  activeProjectPath: string | null;
  loading: boolean;
};

type UserProjectsState = {
  activeProjectId: string | null;
  activeProjectPath: string | null;
  loading: boolean;
  projects: UserProject[];
  uid: string | null;
};

export function useUserProjects(uid: string | null): UseUserProjectsResult {
  const [state, setState] = useState<UserProjectsState>(() => getInitialUserProjectsState(uid));
  updateUserProjectsDebug({
    activeProjectId: state.activeProjectId,
    activeProjectPath: state.activeProjectPath,
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
    const mapProjects = (
      recentProjects: Array<{ id: string; missing?: boolean; path?: string; title: string }>
    ) =>
      recentProjects.map((project) => ({
        id: project.id,
        path: project.path ?? project.id,
        title: project.title,
        slug: project.id,
        summary: project.missing ? "Project folder is missing." : "Local desktop project.",
        status: project.missing ? "missing" : "active",
      }));

    const applyState = (nextState: UserProjectsState) => {
      setState((current) => (areUserProjectsStatesEqual(current, nextState) ? current : nextState));
    };

    const syncRefresh = (phase: string) => {
      const syncState = getWindowSyncProjectState();

      if (!syncState || cancelled) {
        return;
      }

      const nextState = {
        activeProjectId: syncState.currentProject?.id ?? null,
        activeProjectPath: syncState.currentProject?.path ?? null,
        loading: false,
        projects: mapProjects(syncState.recentProjects),
        uid: currentUid,
      };

      applyState(nextState);
      updateUserProjectsDebug({
        activeProjectId: nextState.activeProjectId,
        activeProjectPath: nextState.activeProjectPath,
        loading: nextState.loading,
        phase,
        projects: nextState.projects.map((project) => project.id),
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
        activeProjectPath: current.activeProjectPath,
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

        const activeProjectPath =
          projects.find((project) => project.id === activeProjectId)?.path ?? null;

        applyState({
          activeProjectId,
          activeProjectPath,
          loading: false,
          projects,
          uid: currentUid,
        });
        updateUserProjectsDebug({
          activeProjectId,
          activeProjectPath,
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
          activeProjectPath: null,
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
    activeProjectPath: uid && matchesCurrentUser ? state.activeProjectPath : null,
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
      activeProjectPath: bootstrap.currentProject?.path ?? null,
      loading: false,
      projects: Array.isArray(bootstrap.recentProjects)
        ? bootstrap.recentProjects.map((project) => ({
            id: project.id,
            path: project.path ?? project.id,
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
      activeProjectPath: syncState.currentProject?.path ?? null,
      loading: false,
      projects: syncState.recentProjects.map((project) => ({
        id: project.id,
        path: project.path,
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
    activeProjectPath: null,
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
    currentProject?: { id: string; path?: string } | null;
    recentProjects?: Array<{
      id: string;
      missing?: boolean;
      path?: string;
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

function areUserProjectsStatesEqual(
  current: UserProjectsState,
  next: UserProjectsState
) {
  if (
    current.uid !== next.uid ||
    current.loading !== next.loading ||
    current.activeProjectId !== next.activeProjectId ||
    current.activeProjectPath !== next.activeProjectPath ||
    current.projects.length !== next.projects.length
  ) {
    return false;
  }

  return current.projects.every((project, index) => {
    const nextProject = next.projects[index];

    return (
      !!nextProject &&
      project.id === nextProject.id &&
      project.path === nextProject.path &&
      project.title === nextProject.title &&
      project.slug === nextProject.slug &&
      project.summary === nextProject.summary &&
      project.status === nextProject.status
    );
  });
}
