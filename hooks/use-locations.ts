"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { observeLocationsForProject } from "@/lib/firebase/locations";
import type { UserProject } from "@/lib/firebase/projects";
import type { Location } from "@/types/location";

type UseLocationsResult = {
  locations: Location[];
  loading: boolean;
  error: string | null;
  user: User | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type LocationsState = {
  key: string | null;
  locations: Location[];
  error: string | null;
};

export function useLocations(): UseLocationsResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<LocationsState>({
    key: null,
    locations: [],
    error: null,
  });
  const queryKey = uid && activeProjectId ? `${uid}:${activeProjectId}` : null;

  useEffect(() => {
    if (!queryKey || !uid || !activeProjectId) {
      return;
    }

    return observeLocationsForProject(
      uid,
      activeProjectId,
      (nextLocations) => {
        setState({
          key: queryKey,
          locations: nextLocations,
          error: null,
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          locations: [],
          error: getErrorMessage(nextError),
        });
      }
    );
  }, [activeProjectId, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    locations: matchesCurrentQuery ? state.locations : [],
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
      : "Unable to load locations for the active project."
  );
}
