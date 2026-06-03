"use client";

import { useEffect, useState } from "react";
import type { AppAuthUser } from "@/types/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { getOrganizationsForProject } from "@/lib/data/organizations";
import type { UserProject } from "@/lib/data/projects";
import type { Organization } from "@/types/organization";

type UseOrganizationsResult = {
  organizations: Organization[];
  loading: boolean;
  error: string | null;
  user: AppAuthUser | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type OrganizationsState = {
  key: string | null;
  organizations: Organization[];
  error: string | null;
};

export function useOrganizations(): UseOrganizationsResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<OrganizationsState>({
    key: null,
    organizations: [],
    error: null,
  });
  const queryKey = uid && activeProjectId ? `${uid}:${activeProjectId}` : null;

  useEffect(() => {
    let cancelled = false;

    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    void getOrganizationsForProject(uid, activeProjectId)
      .then((nextOrganizations) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          organizations: nextOrganizations,
          error: null,
        });
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        setState({
          key: queryKey,
          organizations: [],
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
    organizations: matchesCurrentQuery ? state.organizations : [],
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
      : "Unable to load organizations for the active project."
  );
}


