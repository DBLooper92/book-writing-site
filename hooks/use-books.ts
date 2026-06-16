"use client";

import { useEffect, useState } from "react";
import type { AppAuthUser } from "@/types/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { getBooksForProject } from "@/lib/data/books";
import type { UserProject } from "@/lib/data/projects";
import type { Book } from "@/types/book";

type UseBooksResult = {
  books: Book[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  user: AppAuthUser | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type BooksState = {
  key: string | null;
  books: Book[];
  error: string | null;
};

export function useBooks(): UseBooksResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<BooksState>({
    key: null,
    books: [],
    error: null,
  });
  const [reloadToken, setReloadToken] = useState(0);
  const queryKey = uid && activeProjectId ? `${uid}:${activeProjectId}` : null;

  useEffect(() => {
    let cancelled = false;

    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    void getBooksForProject(uid, activeProjectId)
      .then((nextBooks) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          books: nextBooks,
          error: null,
        });
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          books: [],
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
    books: matchesCurrentQuery ? state.books : [],
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
  return error instanceof Error ? error.message : "Unable to load books for the active project.";
}


