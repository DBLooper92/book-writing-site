"use client";

import { useEffect, useState } from "react";
import type { AppAuthUser } from "@/types/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import type { UserProject } from "@/lib/data/projects";
import { getRelationshipById } from "@/lib/data/relationships";
import type { Relationship } from "@/types/relationship";

type UseRelationshipResult = {
  relationship: Relationship | null;
  loading: boolean;
  error: string | null;
  user: AppAuthUser | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type RelationshipState = {
  key: string | null;
  relationship: Relationship | null;
  error: string | null;
};

export function useRelationship(relationshipId: string | null): UseRelationshipResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<RelationshipState>({
    key: null,
    relationship: null,
    error: null,
  });
  const queryKey =
    uid && activeProjectId && relationshipId
      ? `${uid}:${activeProjectId}:${relationshipId}`
      : null;

  useEffect(() => {
    let cancelled = false;

    if (!queryKey || !uid || !activeProjectId || !relationshipId) {
      return;
    }

    void getRelationshipById(uid, activeProjectId, relationshipId)
      .then((nextRelationship) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          relationship: nextRelationship,
          error: nextRelationship ? null : "Relationship not found in the active project.",
        });
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          relationship: null,
          error: getErrorMessage(nextError),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [activeProjectId, queryKey, relationshipId, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    relationship: matchesCurrentQuery ? state.relationship : null,
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
      : "Unable to load this relationship from the active project."
  );
}


