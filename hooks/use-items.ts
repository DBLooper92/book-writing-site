"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { observeItemsForProject } from "@/lib/firebase/items";
import type { UserProject } from "@/lib/firebase/projects";
import type { Item } from "@/types/item";

type UseItemsResult = {
  items: Item[];
  loading: boolean;
  error: string | null;
  user: User | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type ItemListState = {
  key: string | null;
  items: Item[];
  error: string | null;
};

export function useItems(): UseItemsResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<ItemListState>({
    key: null,
    items: [],
    error: null,
  });
  const queryKey = uid && activeProjectId ? `${uid}:${activeProjectId}` : null;

  useEffect(() => {
    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    return observeItemsForProject(
      uid,
      activeProjectId,
      (nextItems) => {
        setState({
          key: queryKey,
          items: nextItems,
          error: null,
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          items: [],
          error: getErrorMessage(nextError),
        });
      }
    );
  }, [activeProjectId, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    items: matchesCurrentQuery ? state.items : [],
    loading,
    error: matchesCurrentQuery ? state.error : null,
    user,
    uid,
    activeProjectId,
    activeProject,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to load items for the active project.";
}
