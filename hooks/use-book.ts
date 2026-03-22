"use client";

import { useEffect, useState } from "react";
import type { AppAuthUser } from "@/types/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { getBookById } from "@/lib/data/books";
import type { UserProject } from "@/lib/data/projects";
import type { Book } from "@/types/book";

type UseBookResult = {
  book: Book | null;
  loading: boolean;
  error: string | null;
  user: AppAuthUser | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type BookState = {
  key: string | null;
  book: Book | null;
  error: string | null;
};

export function useBook(bookId: string | null): UseBookResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<BookState>({
    key: null,
    book: null,
    error: null,
  });
  const queryKey = uid && activeProjectId && bookId ? `${uid}:${activeProjectId}:${bookId}` : null;

  useEffect(() => {
    let cancelled = false;

    if (!queryKey || !uid || !activeProjectId || !bookId) {
      return;
    }

    void getBookById(uid, activeProjectId, bookId)
      .then((nextBook) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          book: nextBook,
          error: nextBook ? null : "Book not found in the active project.",
        });
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          book: null,
          error: getErrorMessage(nextError),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [activeProjectId, bookId, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    book: matchesCurrentQuery ? state.book : null,
    loading,
    error: matchesCurrentQuery ? state.error : null,
    user,
    uid,
    activeProjectId,
    activeProject,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to load this book from the active project.";
}


