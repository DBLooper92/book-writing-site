"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { observeReligionById } from "@/lib/firebase/religions";
import type { UserProject } from "@/lib/firebase/projects";
import type { Religion } from "@/types/religion";

type UseReligionResult = {
  religion: Religion | null;
  loading: boolean;
  error: string | null;
  user: User | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type ReligionState = {
  key: string | null;
  religion: Religion | null;
  error: string | null;
};

export function useReligion(religionId: string | null): UseReligionResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<ReligionState>({
    key: null,
    religion: null,
    error: null,
  });
  const queryKey =
    uid && activeProjectId && religionId ? `${uid}:${activeProjectId}:${religionId}` : null;

  useEffect(() => {
    if (!queryKey || !uid || !activeProjectId || !religionId) {
      return;
    }

    return observeReligionById(
      uid,
      activeProjectId,
      religionId,
      (nextReligion) => {
        setState({
          key: queryKey,
          religion: nextReligion,
          error: nextReligion ? null : "Religion not found in the active project.",
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          religion: null,
          error: getErrorMessage(nextError),
        });
      }
    );
  }, [activeProjectId, queryKey, religionId, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    religion: matchesCurrentQuery ? state.religion : null,
    loading,
    error: matchesCurrentQuery ? state.error : null,
    user,
    uid,
    activeProjectId,
    activeProject,
  };
}

function getErrorMessage(error: unknown) {
  return (
    error instanceof Error ? error.message : "Unable to load this religion from the active project."
  );
}
