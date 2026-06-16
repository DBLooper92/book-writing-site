import "client-only";

import { normalizeAiCapabilitySettings } from "@/lib/ai/capabilities";
import { LOCAL_DESKTOP_AUTH_USER } from "@/lib/auth";
import type { BookBibleProfileSettings } from "@/types/electron-api";

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
  aiCreativeEnabled: boolean;
  aiOrganizationalEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
};

function getProfileDisplayName(profile: BookBibleProfileSettings | null | undefined) {
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim();

  if (fullName) {
    return fullName;
  }

  if (profile?.defaultPenName) {
    return profile.defaultPenName;
  }

  return profile?.penNames?.[0] ?? null;
}

export async function getProfileById(uid: string) {
  if (uid !== LOCAL_DESKTOP_AUTH_USER.uid) {
    return null;
  }

  const currentProject = await window.bookBible.project.getCurrent();
  const now = new Date().toISOString();
  const settings = await window.bookBible.app.getSettings();

  return {
    id: LOCAL_DESKTOP_AUTH_USER.uid,
    email: LOCAL_DESKTOP_AUTH_USER.email,
    displayName: getProfileDisplayName(settings.profile) ?? LOCAL_DESKTOP_AUTH_USER.displayName,
    role: "owner",
    plan: "desktop",
    status: "active",
    activeProjectId: currentProject?.id ?? null,
    aiCreativeEnabled: normalizeAiCapabilitySettings({
      ai_creative_enabled: true,
      ai_organizational_enabled: true,
    }).creativeEnabled,
    aiOrganizationalEnabled: normalizeAiCapabilitySettings({
      ai_creative_enabled: true,
      ai_organizational_enabled: true,
    }).organizationalEnabled,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  };
}

export async function upsertUserProfile() {
  return;
}
