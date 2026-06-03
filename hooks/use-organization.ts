"use client";

import { useEffect, useState } from "react";
import type { AppAuthUser } from "@/types/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { getOrganizationById } from "@/lib/data/organizations";
import type { UserProject } from "@/lib/data/projects";
import type { Organization } from "@/types/organization";

type UseOrganizationResult = {
  organization: Organization | null;
  loading: boolean;
  error: string | null;
  user: AppAuthUser | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type OrganizationState = {
  key: string | null;
  organization: Organization | null;
  error: string | null;
};

export function useOrganization(organizationId: string | null): UseOrganizationResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<OrganizationState>({
    key: null,
    organization: null,
    error: null,
  });
  const queryKey =
    uid && activeProjectId && organizationId
      ? `${uid}:${activeProjectId}:${organizationId}`
      : null;

  useEffect(() => {
    let cancelled = false;

    if (!queryKey || !uid || !activeProjectId || !organizationId) {
      return;
    }

    void getOrganizationById(uid, activeProjectId, organizationId)
      .then((nextOrganization) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          organization: nextOrganization,
          error: nextOrganization ? null : "Organization not found in the active project.",
        });
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          organization: null,
          error: getErrorMessage(nextError),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [activeProjectId, organizationId, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    organization: matchesCurrentQuery ? state.organization : null,
    loading,
    error: matchesCurrentQuery ? state.error : null,
    user,
    uid,
    activeProjectId,
    activeProject,
  };
}

function getErrorMessage(error: unknown) {
  return (
    error instanceof Error
      ? error.message
      : "Unable to load this organization from the active project."
  );
}


