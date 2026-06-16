"use client";

import { useEffect, useState } from "react";
import type { AppAuthUser } from "@/types/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { getChaptersForProject } from "@/lib/data/chapters";
import type { UserProject } from "@/lib/data/projects";
import type { Chapter } from "@/types/chapter";

type UseChaptersResult = {
  chapters: Chapter[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  user: AppAuthUser | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type ChaptersState = {
  key: string | null;
  chapters: Chapter[];
  error: string | null;
};

export function useChapters(): UseChaptersResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<ChaptersState>({
    key: null,
    chapters: [],
    error: null,
  });
  const [reloadToken, setReloadToken] = useState(0);
  const queryKey = uid && activeProjectId ? `${uid}:${activeProjectId}` : null;

  useEffect(() => {
    let cancelled = false;

    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    void getChaptersForProject(uid, activeProjectId)
      .then((nextChapters) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          chapters: nextChapters,
          error: null,
        });
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          chapters: [],
          error: getErrorMessage(nextError),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [activeProjectId, queryKey, reloadToken, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    chapters: matchesCurrentQuery ? state.chapters : [],
    loading,
    error: matchesCurrentQuery ? state.error : null,
    reload: () => setReloadToken((current) => current + 1),
    user,
    uid,
    activeProjectId,
    activeProject,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to load chapters for the active project.";
}
