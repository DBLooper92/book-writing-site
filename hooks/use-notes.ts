"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { observeNotesForProject } from "@/lib/firebase/notes";
import type { UserProject } from "@/lib/firebase/projects";
import type { Note } from "@/types/note";

type UseNotesResult = {
  notes: Note[];
  loading: boolean;
  error: string | null;
  user: User | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type NotesState = {
  key: string | null;
  notes: Note[];
  error: string | null;
};

export function useNotes(): UseNotesResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<NotesState>({
    key: null,
    notes: [],
    error: null,
  });
  const queryKey = uid && activeProjectId ? `${uid}:${activeProjectId}` : null;

  useEffect(() => {
    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    return observeNotesForProject(
      uid,
      activeProjectId,
      (nextNotes) => {
        setState({
          key: queryKey,
          notes: nextNotes,
          error: null,
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          notes: [],
          error: getErrorMessage(nextError),
        });
      }
    );
  }, [activeProjectId, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    notes: matchesCurrentQuery ? state.notes : [],
    loading,
    error: matchesCurrentQuery ? state.error : null,
    user,
    uid,
    activeProjectId,
    activeProject,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to load notes for the active project.";
}
