"use client";

import { useEffect, useState } from "react";
import type { AppAuthUser } from "@/types/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { getGlossaryTermsForProject } from "@/lib/data/glossary-terms";
import type { UserProject } from "@/lib/data/projects";
import type { GlossaryTerm } from "@/types/glossary-term";

type UseGlossaryTermsResult = {
  glossaryTerms: GlossaryTerm[];
  loading: boolean;
  error: string | null;
  user: AppAuthUser | null;
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
    let cancelled = false;

    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    void getGlossaryTermsForProject(uid, activeProjectId)
      .then((nextGlossaryTerms) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          glossaryTerms: nextGlossaryTerms,
          error: null,
        });
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          glossaryTerms: [],
          error: getErrorMessage(nextError),
        });
      });

    return () => {
      cancelled = true;
    };
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


