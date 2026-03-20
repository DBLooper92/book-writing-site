"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { observeGlossaryTermsForProject } from "@/lib/firebase/glossary-terms";
import type { UserProject } from "@/lib/firebase/projects";
import type { GlossaryTerm } from "@/types/glossary-term";

type UseGlossaryTermsResult = {
  glossaryTerms: GlossaryTerm[];
  loading: boolean;
  error: string | null;
  user: User | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type GlossaryTermListState = {
  key: string | null;
  glossaryTerms: GlossaryTerm[];
  error: string | null;
};

export function useGlossaryTerms(): UseGlossaryTermsResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<GlossaryTermListState>({
    key: null,
    glossaryTerms: [],
    error: null,
  });
  const queryKey = uid && activeProjectId ? `${uid}:${activeProjectId}` : null;

  useEffect(() => {
    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    return observeGlossaryTermsForProject(
      uid,
      activeProjectId,
      (nextGlossaryTerms) => {
        setState({
          key: queryKey,
          glossaryTerms: nextGlossaryTerms,
          error: null,
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          glossaryTerms: [],
          error: getErrorMessage(nextError),
        });
      }
    );
  }, [activeProjectId, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    glossaryTerms: matchesCurrentQuery ? state.glossaryTerms : [],
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
    : "Unable to load glossary terms for the active project.";
}
