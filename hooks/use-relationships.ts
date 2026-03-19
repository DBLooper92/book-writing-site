"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { observeRelationshipsForProject } from "@/lib/firebase/relationships";
import type { UserProject } from "@/lib/firebase/projects";
import type { Relationship } from "@/types/relationship";

type UseRelationshipsResult = {
  relationships: Relationship[];
  loading: boolean;
  error: string | null;
  user: User | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type RelationshipsState = {
  key: string | null;
  relationships: Relationship[];
  error: string | null;
};

export function useRelationships(): UseRelationshipsResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<RelationshipsState>({
    key: null,
    relationships: [],
    error: null,
  });
  const queryKey = uid && activeProjectId ? `${uid}:${activeProjectId}` : null;

  useEffect(() => {
    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    return observeRelationshipsForProject(
      uid,
      activeProjectId,
      (nextRelationships) => {
        setState({
          key: queryKey,
          relationships: nextRelationships,
          error: null,
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          relationships: [],
          error: getErrorMessage(nextError),
        });
      }
    );
  }, [activeProjectId, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    relationships: matchesCurrentQuery ? state.relationships : [],
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
    error instanceof Error
      ? error.message
      : "Unable to load relationships for the active project."
  );
}
