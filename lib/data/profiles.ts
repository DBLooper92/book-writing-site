import "client-only";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";

export type ProfileOwnerContext = {
  uid: string;
  email: string | null;
  displayName: string | null;
};

export type UserProfile = {
  id: string;
  email: string | null;
  displayName: string | null;
  role: string;
  plan: string;
  status: string;
  activeProjectId: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
};

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export async function getProfileById(uid: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", uid)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeProfileRow(data as ProfileRow) : null;
}

export async function upsertUserProfile(
  owner: ProfileOwnerContext,
  overrides: Partial<{
    activeProjectId: string | null;
    lastLoginAt: string | null;
  }> = {}
) {
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();
  const { error } = await supabase.from("profiles").upsert(
    {
      id: owner.uid,
      email: owner.email ?? null,
      display_name: owner.displayName ?? null,
      role: "owner",
      plan: "personal",
      status: "active",
      active_project_id:
        overrides.activeProjectId === undefined ? undefined : overrides.activeProjectId,
      updated_at: now,
      last_login_at:
        overrides.lastLoginAt === undefined ? now : overrides.lastLoginAt,
    },
    {
      onConflict: "id",
    }
  );

  if (error) {
    throw error;
  }
}

function normalizeProfileRow(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    plan: row.plan,
    status: row.status,
    activeProjectId: row.active_project_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
  };
}
