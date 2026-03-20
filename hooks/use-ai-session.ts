"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { observeAiSessionById } from "@/lib/firebase/ai-sessions";
import type { UserProject } from "@/lib/firebase/projects";
import type { AiSession } from "@/types/ai-session";

type UseAiSessionResult = {
  aiSession: AiSession | null;
  loading: boolean;
  error: string | null;
  user: User | null;
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
    if (!queryKey || !uid || !activeProjectId || !aiSessionId) {
      return;
    }

    return observeAiSessionById(
      uid,
      activeProjectId,
      aiSessionId,
      (nextAiSession) => {
        setState({
          key: queryKey,
          aiSession: nextAiSession,
          error: nextAiSession ? null : "AI session not found in the active project.",
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          aiSession: null,
          error: getErrorMessage(nextError),
        });
      }
    );
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
