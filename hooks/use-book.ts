"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { observeBookById } from "@/lib/firebase/books";
import type { UserProject } from "@/lib/firebase/projects";
import type { Book } from "@/types/book";

type UseBookResult = {
  book: Book | null;
  loading: boolean;
  error: string | null;
  user: User | null;
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
    if (!queryKey || !uid || !activeProjectId || !bookId) {
      return;
    }

    return observeBookById(
      uid,
      activeProjectId,
      bookId,
      (nextBook) => {
        setState({
          key: queryKey,
          book: nextBook,
          error: nextBook ? null : "Book not found in the active project.",
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          book: null,
          error: getErrorMessage(nextError),
        });
      }
    );
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
