"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { observeNoteById } from "@/lib/firebase/notes";
import type { UserProject } from "@/lib/firebase/projects";
import type { Note } from "@/types/note";

type UseNoteResult = {
  note: Note | null;
  loading: boolean;
  error: string | null;
  user: User | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type NoteState = {
  key: string | null;
  note: Note | null;
  error: string | null;
};

export function useNote(noteId: string | null): UseNoteResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<NoteState>({
    key: null,
    note: null,
    error: null,
  });
  const queryKey = uid && activeProjectId && noteId ? `${uid}:${activeProjectId}:${noteId}` : null;

  useEffect(() => {
    if (!queryKey || !uid || !activeProjectId || !noteId) {
      return;
    }

    return observeNoteById(
      uid,
      activeProjectId,
      noteId,
      (nextNote) => {
        setState({
          key: queryKey,
          note: nextNote,
          error: nextNote ? null : "Note not found in the active project.",
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          note: null,
          error: getErrorMessage(nextError),
        });
      }
    );
  }, [activeProjectId, noteId, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    note: matchesCurrentQuery ? state.note : null,
    loading,
    error: matchesCurrentQuery ? state.error : null,
    user,
    uid,
    activeProjectId,
    activeProject,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to load this note from the active project.";
}
