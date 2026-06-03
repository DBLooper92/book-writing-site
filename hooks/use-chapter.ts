"use client";

import { useEffect, useState } from "react";
import type { AppAuthUser } from "@/types/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { getChapterById } from "@/lib/data/chapters";
import type { UserProject } from "@/lib/data/projects";
import type { Chapter } from "@/types/chapter";

type UseChapterResult = {
  chapter: Chapter | null;
  loading: boolean;
  error: string | null;
  user: AppAuthUser | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type ChapterState = {
  key: string | null;
  chapter: Chapter | null;
  error: string | null;
};

export function useChapter(chapterId: string | null): UseChapterResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<ChapterState>({
    key: null,
    chapter: null,
    error: null,
  });
  const queryKey =
    uid && activeProjectId && chapterId ? `${uid}:${activeProjectId}:${chapterId}` : null;

  useEffect(() => {
    let cancelled = false;

    if (!queryKey || !uid || !activeProjectId || !chapterId) {
      return;
    }

    void getChapterById(uid, activeProjectId, chapterId)
      .then((nextChapter) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          chapter: nextChapter,
          error: nextChapter ? null : "Chapter not found in the active project.",
        });
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          chapter: null,
          error: getErrorMessage(nextError),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [activeProjectId, chapterId, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    chapter: matchesCurrentQuery ? state.chapter : null,
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
    : "Unable to load this chapter from the active project.";
}
