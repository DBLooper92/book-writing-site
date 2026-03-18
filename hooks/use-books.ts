"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { observeBooksForProject } from "@/lib/firebase/books";
import type { UserProject } from "@/lib/firebase/projects";
import type { Book } from "@/types/book";

type UseBooksResult = {
  books: Book[];
  loading: boolean;
  error: string | null;
  user: User | null;
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
  const queryKey = uid && activeProjectId ? `${uid}:${activeProjectId}` : null;

  useEffect(() => {
    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    return observeBooksForProject(
      uid,
      activeProjectId,
      (nextBooks) => {
        setState({
          key: queryKey,
          books: nextBooks,
          error: null,
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          books: [],
          error: getErrorMessage(nextError),
        });
      }
    );
  }, [activeProjectId, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    books: matchesCurrentQuery ? state.books : [],
    loading,
    error: matchesCurrentQuery ? state.error : null,
    user,
    uid,
    activeProjectId,
    activeProject,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to load books for the active project.";
}
