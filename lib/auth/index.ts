import "client-only";

import type { AppAuthSession, AppAuthUser } from "@/types/auth";

export const LOCAL_DESKTOP_AUTH_USER: AppAuthUser = {
  id: "local-desktop",
  uid: "local-desktop",
  email: "local@desktop.invalid",
  displayName: "Local Desktop User",
};

export async function signUpWithEmail() {
  return {
    data: {
      session: {
        user: LOCAL_DESKTOP_AUTH_USER,
      },
      user: LOCAL_DESKTOP_AUTH_USER,
    },
    error: null,
  };
}

export async function signInWithEmail() {
  return {
    data: {
      session: {
        user: LOCAL_DESKTOP_AUTH_USER,
      },
      user: LOCAL_DESKTOP_AUTH_USER,
    },
    error: null,
  };
}

export async function signOutCurrentUser() {
  return;
}

export async function getCurrentAuthUser() {
  return LOCAL_DESKTOP_AUTH_USER;
}

export function observeAuthState(callback: (user: AppAuthUser | null) => void) {
  callback(LOCAL_DESKTOP_AUTH_USER);
  return () => {};
}

export function normalizeSupabaseUser(): AppAuthUser {
  return LOCAL_DESKTOP_AUTH_USER;
}

export function normalizeAuthSession(): AppAuthSession {
  return {
    user: LOCAL_DESKTOP_AUTH_USER,
  };
}
