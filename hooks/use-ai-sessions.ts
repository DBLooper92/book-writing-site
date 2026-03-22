"use client";

import { useEffect, useState } from "react";
import type { AppAuthUser } from "@/types/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { getAiSessionsForProject } from "@/lib/data/ai-sessions";
import type { UserProject } from "@/lib/data/projects";
import type { AiSession } from "@/types/ai-session";

type UseAiSessionsResult = {
  aiSessions: AiSession[];
  loading: boolean;
  error: string | null;
  user: AppAuthUser | null;
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
    let cancelled = false;

    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    void getAiSessionsForProject(uid, activeProjectId)
      .then((nextAiSessions) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          aiSessions: nextAiSessions,
          error: null,
        });
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          aiSessions: [],
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


