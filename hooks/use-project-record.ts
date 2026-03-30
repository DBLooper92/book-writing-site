"use client";

import { useEffect, useState } from "react";

import { useActiveProject } from "@/hooks/use-active-project";
import { getProjectById, type ProjectRecord } from "@/lib/data/projects";

type ProjectRecordState = {
  key: string | null;
  projectRecord: ProjectRecord | null;
  error: string | null;
};

export function useProjectRecord() {
  const { user, uid, activeProjectId, activeProject, loading: activeProjectLoading } =
    useActiveProject();
  const [state, setState] = useState<ProjectRecordState>({
    key: null,
    projectRecord: null,
    error: null,
  });
  const queryKey = uid && activeProjectId ? `${uid}:${activeProjectId}` : null;

  useEffect(() => {
    let cancelled = false;

    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    void getProjectById(uid, activeProjectId)
      .then((nextProjectRecord) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          projectRecord: nextProjectRecord,
          error: nextProjectRecord ? null : "Active project details could not be found.",
        });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          projectRecord: null,
          error:
            error instanceof Error ? error.message : "Unable to load active project details.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [activeProjectId, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = activeProjectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    user,
    uid,
    activeProjectId,
    activeProject,
    projectRecord: matchesCurrentQuery ? state.projectRecord : null,
    projectError: matchesCurrentQuery ? state.error : null,
    loading,
  };
}
