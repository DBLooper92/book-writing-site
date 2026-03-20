"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { observeAttachmentsForProject } from "@/lib/firebase/attachments";
import type { UserProject } from "@/lib/firebase/projects";
import type { Attachment } from "@/types/attachment";

type UseAttachmentsResult = {
  attachments: Attachment[];
  loading: boolean;
  error: string | null;
  user: User | null;
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
    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    return observeAttachmentsForProject(
      uid,
      activeProjectId,
      (nextAttachments) => {
        setState({
          key: queryKey,
          attachments: nextAttachments,
          error: null,
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          attachments: [],
          error: getErrorMessage(nextError),
        });
      }
    );
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
