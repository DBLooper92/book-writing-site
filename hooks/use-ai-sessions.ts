"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { observeAiSessionsForProject } from "@/lib/firebase/ai-sessions";
import type { UserProject } from "@/lib/firebase/projects";
import type { AiSession } from "@/types/ai-session";

type UseAiSessionsResult = {
  aiSessions: AiSession[];
  loading: boolean;
  error: string | null;
  user: User | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type AiSessionsState = {
  key: string | null;
  aiSessions: AiSession[];
  error: string | null;
};

export function useAiSessions(): UseAiSessionsResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<AiSessionsState>({
    key: null,
    aiSessions: [],
    error: null,
  });
  const queryKey = uid && activeProjectId ? `${uid}:${activeProjectId}` : null;

  useEffect(() => {
    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    return observeAiSessionsForProject(
      uid,
      activeProjectId,
      (nextAiSessions) => {
        setState({
          key: queryKey,
          aiSessions: nextAiSessions,
          error: null,
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          aiSessions: [],
          error: getErrorMessage(nextError),
        });
      }
    );
  }, [activeProjectId, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    aiSessions: matchesCurrentQuery ? state.aiSessions : [],
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
    : "Unable to load AI sessions for the active project.";
}
