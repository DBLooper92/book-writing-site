"use client";

import { useEffect, useState } from "react";
import type { AppAuthUser } from "@/types/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { getOutlineById } from "@/lib/data/outlines";
import type { UserProject } from "@/lib/data/projects";
import type { Outline } from "@/types/outline";

type UseOutlineResult = {
  outline: Outline | null;
  loading: boolean;
  error: string | null;
  user: AppAuthUser | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type OutlineState = {
  key: string | null;
  outline: Outline | null;
  error: string | null;
};

export function useOutline(outlineId: string | null): UseOutlineResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<OutlineState>({
    key: null,
    outline: null,
    error: null,
  });
  const queryKey =
    uid && activeProjectId && outlineId ? `${uid}:${activeProjectId}:${outlineId}` : null;

  useEffect(() => {
    let cancelled = false;

    if (!queryKey || !uid || !activeProjectId || !outlineId) {
      return;
    }

    void getOutlineById(uid, activeProjectId, outlineId)
      .then((nextOutline) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          outline: nextOutline,
          error: nextOutline ? null : "Outline not found in the active project.",
        });
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          outline: null,
          error: getErrorMessage(nextError),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [activeProjectId, outlineId, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    outline: matchesCurrentQuery ? state.outline : null,
    loading,
    error: matchesCurrentQuery ? state.error : null,
    user,
    uid,
    activeProjectId,
    activeProject,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to load this outline from the active project.";
}


