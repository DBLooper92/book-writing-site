"use client";

import { LOCAL_DESKTOP_AUTH_USER } from "@/lib/auth";

type UseAuthUserResult = {
  user: typeof LOCAL_DESKTOP_AUTH_USER | null;
  uid: string | null;
  loading: boolean;
};

export function useAuthUser(): UseAuthUserResult {
  return {
    user: LOCAL_DESKTOP_AUTH_USER,
    uid: LOCAL_DESKTOP_AUTH_USER.uid,
    loading: false,
  };
}
