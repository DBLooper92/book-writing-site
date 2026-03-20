"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { observeOutlineById } from "@/lib/firebase/outlines";
import type { UserProject } from "@/lib/firebase/projects";
import type { Outline } from "@/types/outline";

type UseOutlineResult = {
  outline: Outline | null;
  loading: boolean;
  error: string | null;
  user: User | null;
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
    if (!queryKey || !uid || !activeProjectId || !outlineId) {
      return;
    }

    return observeOutlineById(
      uid,
      activeProjectId,
      outlineId,
      (nextOutline) => {
        setState({
          key: queryKey,
          outline: nextOutline,
          error: nextOutline ? null : "Outline not found in the active project.",
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          outline: null,
          error: getErrorMessage(nextError),
        });
      }
    );
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
