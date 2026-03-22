"use client";

import { useEffect, useState } from "react";
import type { AppAuthUser } from "@/types/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { getGlossaryTermById } from "@/lib/data/glossary-terms";
import type { UserProject } from "@/lib/data/projects";
import type { GlossaryTerm } from "@/types/glossary-term";

type UseGlossaryTermResult = {
  glossaryTerm: GlossaryTerm | null;
  loading: boolean;
  error: string | null;
  user: AppAuthUser | null;
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
    let cancelled = false;

    if (!queryKey || !uid || !activeProjectId || !glossaryTermId) {
      return;
    }

    void getGlossaryTermById(uid, activeProjectId, glossaryTermId)
      .then((nextGlossaryTerm) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          glossaryTerm: nextGlossaryTerm,
          error: nextGlossaryTerm ? null : "Glossary term not found in the active project.",
        });
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          glossaryTerm: null,
          error: getErrorMessage(nextError),
        });
      });

    return () => {
      cancelled = true;
    };
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


