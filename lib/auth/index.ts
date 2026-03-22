import "client-only";

import type { User as SupabaseUser } from "@supabase/supabase-js";

import { upsertUserProfile } from "@/lib/data/profiles";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { AppAuthUser } from "@/types/auth";

export async function signUpWithEmail(email: string, password: string) {
  const supabase = getSupabaseBrowserClient();
  const result = await supabase.auth.signUp({
    email,
    password,
  });

  if (result.error) {
    throw result.error;
  }

  const normalizedUser = normalizeSupabaseUser(result.data.user);

  // When email confirmation is enabled, Supabase may create the user without
  // returning an authenticated session yet. In that case, profile upsert must
  // wait until the user actually signs in and the auth listener runs.
  if (normalizedUser && result.data.session) {
    await upsertUserProfile({
      uid: normalizedUser.uid,
      email: normalizedUser.email,
      displayName: normalizedUser.displayName,
    });
  }

  return result;
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = getSupabaseBrowserClient();
  const result = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (result.error) {
    throw result.error;
  }

  const normalizedUser = normalizeSupabaseUser(result.data.user);

  if (normalizedUser) {
    await upsertUserProfile({
      uid: normalizedUser.uid,
      email: normalizedUser.email,
      displayName: normalizedUser.displayName,
    });
  }

  return result;
}

export async function signOutCurrentUser() {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signOut({
    scope: "local",
  });

  if (error) {
    throw error;
  }
}

export async function getCurrentAuthUser() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return normalizeSupabaseUser(data.user);
}

export function observeAuthState(callback: (user: AppAuthUser | null) => void) {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    const normalizedUser = normalizeSupabaseUser(session?.user ?? null);

    if (normalizedUser) {
      void upsertUserProfile({
        uid: normalizedUser.uid,
        email: normalizedUser.email,
        displayName: normalizedUser.displayName,
      });
    }

    callback(normalizedUser);
  });

  void getCurrentAuthUser()
    .then((user) => {
      callback(user);
    })
    .catch(() => {
      callback(null);
    });

  return () => {
    subscription.unsubscribe();
  };
}

export function normalizeSupabaseUser(user: SupabaseUser | null): AppAuthUser | null {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    uid: user.id,
    email: user.email ?? null,
    displayName: readDisplayName(user),
  };
}

function readDisplayName(user: SupabaseUser) {
  const fullName = user.user_metadata?.full_name;

  if (typeof fullName === "string" && fullName.trim()) {
    return fullName.trim();
  }

  const displayName = user.user_metadata?.display_name;
  return typeof displayName === "string" && displayName.trim()
    ? displayName.trim()
    : null;
}
