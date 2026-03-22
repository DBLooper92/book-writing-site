"use client";

import { useEffect, useState } from "react";
import type { AppAuthUser } from "@/types/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { getAttachmentsForProject } from "@/lib/data/attachments";
import type { UserProject } from "@/lib/data/projects";
import type { Attachment } from "@/types/attachment";

type UseAttachmentsResult = {
  attachments: Attachment[];
  loading: boolean;
  error: string | null;
  user: AppAuthUser | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type AttachmentsState = {
  key: string | null;
  attachments: Attachment[];
  error: string | null;
};

export function useAttachments(): UseAttachmentsResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<AttachmentsState>({
    key: null,
    attachments: [],
    error: null,
  });
  const queryKey = uid && activeProjectId ? `${uid}:${activeProjectId}` : null;

  useEffect(() => {
    let cancelled = false;

    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    void getAttachmentsForProject(uid, activeProjectId)
      .then((nextAttachments) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          attachments: nextAttachments,
          error: null,
        });
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          attachments: [],
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
    attachments: matchesCurrentQuery ? state.attachments : [],
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
    : "Unable to load attachments for the active project.";
}


