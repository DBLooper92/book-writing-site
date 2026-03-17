"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { useActiveProject } from "@/hooks/use-active-project";
import { observeLocationById } from "@/lib/firebase/locations";
import type { UserProject } from "@/lib/firebase/projects";
import type { Location } from "@/types/location";

type UseLocationResult = {
  location: Location | null;
  loading: boolean;
  error: string | null;
  user: User | null;
  uid: string | null;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type LocationState = {
  key: string | null;
  location: Location | null;
  error: string | null;
};

export function useLocation(locationId: string | null): UseLocationResult {
  const { user, uid, activeProjectId, activeProject, loading: projectLoading } =
    useActiveProject();
  const [state, setState] = useState<LocationState>({
    key: null,
    location: null,
    error: null,
  });
  const queryKey =
    uid && activeProjectId && locationId ? `${uid}:${activeProjectId}:${locationId}` : null;

  useEffect(() => {
    if (!queryKey || !uid || !activeProjectId || !locationId) {
      return;
    }

    return observeLocationById(
      uid,
      activeProjectId,
      locationId,
      (nextLocation) => {
        setState({
          key: queryKey,
          location: nextLocation,
          error: nextLocation ? null : "Location not found in the active project.",
        });
      },
      (nextError) => {
        setState({
          key: queryKey,
          location: null,
          error: getErrorMessage(nextError),
        });
      }
    );
  }, [activeProjectId, locationId, queryKey, uid]);

  const matchesCurrentQuery = state.key === queryKey;
  const loading = projectLoading || (!!queryKey && !matchesCurrentQuery);

  return {
    location: matchesCurrentQuery ? state.location : null,
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
      : "Unable to load this location from the active project."
  );
}
