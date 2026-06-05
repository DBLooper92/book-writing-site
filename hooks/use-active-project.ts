"use client";

import { useAuthUser } from "@/hooks/use-auth-user";
import { useUserProjects } from "@/hooks/use-user-projects";
import { getActiveProjectIdSync, listUserProjectsSync } from "@/lib/data/projects";

export function useActiveProject() {
  const { user, uid, loading: authLoading } = useAuthUser();
  const { projects, activeProjectId, loading: projectsLoading } = useUserProjects(uid);
  const syncProjects = uid ? listUserProjectsSync(uid) : [];
  const syncActiveProjectId = uid ? getActiveProjectIdSync(uid) : null;
  const activeProject =
    (syncProjects.find((project) => project.id === syncActiveProjectId) ??
      projects.find((project) => project.id === activeProjectId) ??
      null);

  return {
    user,
    uid,
    activeProjectId: syncActiveProjectId ?? activeProjectId,
    activeProject,
    loading: authLoading || (!syncActiveProjectId && projectsLoading),
  };
}
