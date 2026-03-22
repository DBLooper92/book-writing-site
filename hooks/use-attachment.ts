"use client";

import { useEffect, useState } from "react";
import type { AppAuthUser } from "@/types/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { getAttachmentById } from "@/lib/data/attachments";
import type { UserProject } from "@/lib/data/projects";
import type { Attachment } from "@/types/attachment";

type UseAttachmentResult = {
  attachment: Attachment | null;
  loading: boolean;
  error: string | null;
  user: AppAuthUser | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type AttachmentState = {
  key: string | null;
  attachment: Attachment | null;
  error: string | null;
};

export function useAttachment(attachmentId: string | null): UseAttachmentResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<AttachmentState>({
    key: null,
    attachment: null,
    error: null,
  });
  const queryKey =
    uid && activeProjectId && attachmentId
      ? `${uid}:${activeProjectId}:${attachmentId}`
      : null;

  useEffect(() => {
    let cancelled = false;

    if (!queryKey || !uid || !activeProjectId || !attachmentId) {
      return;
    }

    void getAttachmentById(uid, activeProjectId, attachmentId)
      .then((nextAttachment) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          attachment: nextAttachment,
          error: nextAttachment ? null : "Attachment not found in the active project.",
        });
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          attachment: null,
          error: getErrorMessage(nextError),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [activeProjectId, attachmentId, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    attachment: matchesCurrentQuery ? state.attachment : null,
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
    : "Unable to load this attachment from the active project.";
}


