"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { observeGlossaryTermById } from "@/lib/firebase/glossary-terms";
import type { UserProject } from "@/lib/firebase/projects";
import type { GlossaryTerm } from "@/types/glossary-term";

type UseGlossaryTermResult = {
  glossaryTerm: GlossaryTerm | null;
  loading: boolean;
  error: string | null;
  user: User | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type GlossaryTermState = {
  key: string | null;
  glossaryTerm: GlossaryTerm | null;
  error: string | null;
};

export function useGlossaryTerm(glossaryTermId: string | null): UseGlossaryTermResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<GlossaryTermState>({
    key: null,
    glossaryTerm: null,
    error: null,
  });
  const queryKey =
    uid && activeProjectId && glossaryTermId
      ? `${uid}:${activeProjectId}:${glossaryTermId}`
      : null;

  useEffect(() => {
    if (!queryKey || !uid || !activeProjectId || !glossaryTermId) {
      return;
    }

    return observeGlossaryTermById(
      uid,
      activeProjectId,
      glossaryTermId,
      (nextGlossaryTerm) => {
        setState({
          key: queryKey,
          glossaryTerm: nextGlossaryTerm,
          error: nextGlossaryTerm ? null : "Glossary term not found in the active project.",
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          glossaryTerm: null,
          error: getErrorMessage(nextError),
        });
      }
    );
  }, [activeProjectId, glossaryTermId, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    glossaryTerm: matchesCurrentQuery ? state.glossaryTerm : null,
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
    : "Unable to load this glossary term from the active project.";
}
