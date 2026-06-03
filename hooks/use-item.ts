"use client";

import { useEffect, useState } from "react";
import type { AppAuthUser } from "@/types/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { getItemById } from "@/lib/data/items";
import type { UserProject } from "@/lib/data/projects";
import type { Item } from "@/types/item";

type UseItemResult = {
  item: Item | null;
  loading: boolean;
  error: string | null;
  user: AppAuthUser | null;
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
    let cancelled = false;

    if (!queryKey || !uid || !activeProjectId || !itemId) {
      return;
    }

    void getItemById(uid, activeProjectId, itemId)
      .then((nextItem) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          item: nextItem,
          error: nextItem ? null : "Item not found in the active project.",
        });
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          item: null,
          error: getErrorMessage(nextError),
        });
      });

    return () => {
      cancelled = true;
    };
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


