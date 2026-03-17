"use client";

import { useAuthUser } from "@/hooks/use-auth-user";
import { useUserProjects } from "@/hooks/use-user-projects";

export function useActiveProject() {
  const { user, uid, loading: authLoading } = useAuthUser();
  const { projects, activeProjectId, loading: projectsLoading } = useUserProjects(uid);
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? null;

  return {
    user,
    uid,
    activeProjectId,
    activeProject,
    loading: authLoading || (!!uid && projectsLoading),
  };
}
