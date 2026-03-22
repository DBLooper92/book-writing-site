"use client";

import { useEffect, useState } from "react";
import type { AppAuthUser } from "@/types/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { getAiSessionById } from "@/lib/data/ai-sessions";
import type { UserProject } from "@/lib/data/projects";
import type { AiSession } from "@/types/ai-session";

type UseAiSessionResult = {
  aiSession: AiSession | null;
  loading: boolean;
  error: string | null;
  user: AppAuthUser | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type AiSessionState = {
  key: string | null;
  aiSession: AiSession | null;
  error: string | null;
};

export function useAiSession(aiSessionId: string | null): UseAiSessionResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<AiSessionState>({
    key: null,
    aiSession: null,
    error: null,
  });
  const queryKey =
    uid && activeProjectId && aiSessionId
      ? `${uid}:${activeProjectId}:${aiSessionId}`
      : null;

  useEffect(() => {
    let cancelled = false;

    if (!queryKey || !uid || !activeProjectId || !aiSessionId) {
      return;
    }

    void getAiSessionById(uid, activeProjectId, aiSessionId)
      .then((nextAiSession) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          aiSession: nextAiSession,
          error: nextAiSession ? null : "AI session not found in the active project.",
        });
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          aiSession: null,
          error: getErrorMessage(nextError),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [activeProjectId, aiSessionId, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    aiSession: matchesCurrentQuery ? state.aiSession : null,
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
    : "Unable to load this AI session from the active project.";
}


