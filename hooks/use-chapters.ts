"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { observeChaptersForProject } from "@/lib/firebase/chapters";
import type { UserProject } from "@/lib/firebase/projects";
import type { Chapter } from "@/types/chapter";

type UseChaptersResult = {
  chapters: Chapter[];
  loading: boolean;
  error: string | null;
  user: User | null;
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
  const queryKey = uid && activeProjectId ? `${uid}:${activeProjectId}` : null;

  useEffect(() => {
    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    return observeChaptersForProject(
      uid,
      activeProjectId,
      (nextChapters) => {
        setState({
          key: queryKey,
          chapters: nextChapters,
          error: null,
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          chapters: [],
          error: getErrorMessage(nextError),
        });
      }
    );
  }, [activeProjectId, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    chapters: matchesCurrentQuery ? state.chapters : [],
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
    : "Unable to load chapters for the active project.";
}
