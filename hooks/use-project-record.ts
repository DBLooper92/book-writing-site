"use client";

import { useEffect, useState } from "react";

import { useActiveProject } from "@/hooks/use-active-project";
import { getProjectById, type ProjectRecord } from "@/lib/data/projects";

type ProjectRecordState = {
  error: string | null;
  key: string | null;
  projectRecord: ProjectRecord | null;
};

export function useProjectRecord() {
  const { user, uid, activeProjectId, activeProject, loading: activeProjectLoading } =
    useActiveProject();
  const [state, setState] = useState<ProjectRecordState>({
    error: null,
    key: null,
    projectRecord: null,
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
          error: nextProjectRecord ? null : "Active project details could not be found.",
          key: queryKey,
          projectRecord: nextProjectRecord,
        });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setState({
          error:
            error instanceof Error ? error.message : "Unable to load active project details.",
          key: queryKey,
          projectRecord: null,
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
