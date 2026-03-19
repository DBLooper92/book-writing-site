"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { observeItemById } from "@/lib/firebase/items";
import type { UserProject } from "@/lib/firebase/projects";
import type { Item } from "@/types/item";

type UseItemResult = {
  item: Item | null;
  loading: boolean;
  error: string | null;
  user: User | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type ItemState = {
  key: string | null;
  item: Item | null;
  error: string | null;
};

export function useItem(itemId: string | null): UseItemResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<ItemState>({
    key: null,
    item: null,
    error: null,
  });
  const queryKey =
    uid && activeProjectId && itemId ? `${uid}:${activeProjectId}:${itemId}` : null;

  useEffect(() => {
    if (!queryKey || !uid || !activeProjectId || !itemId) {
      return;
    }

    return observeItemById(
      uid,
      activeProjectId,
      itemId,
      (nextItem) => {
        setState({
          key: queryKey,
          item: nextItem,
          error: nextItem ? null : "Item not found in the active project.",
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          item: null,
          error: getErrorMessage(nextError),
        });
      }
    );
  }, [activeProjectId, itemId, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    item: matchesCurrentQuery ? state.item : null,
    loading,
    error: matchesCurrentQuery ? state.error : null,
    user,
    uid,
    activeProjectId,
    activeProject,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to load this item from the active project.";
}
