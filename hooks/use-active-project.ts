"use client";

import { useAuthUser } from "@/hooks/use-auth-user";
import { useUserProjects } from "@/hooks/use-user-projects";

export function useActiveProject() {
  const { user, uid, loading: authLoading } = useAuthUser();
  const { projects, activeProjectId, activeProjectPath, loading: projectsLoading } =
    useUserProjects(uid);
  const activeProject =
    projects.find((project) => project.path === activeProjectPath) ??
    projects.find((project) => project.id === activeProjectId) ??
    null;

  return {
    user,
    uid,
    activeProjectId,
    activeProjectPath,
    activeProject,
    loading: authLoading || projectsLoading,
  };
}
