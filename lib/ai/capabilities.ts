import type { AiSessionType } from "@/types/ai-session";
import type { Database } from "@/types/database";

export const AI_CAPABILITY_VALUES = ["creative", "organizational"] as const;

export type AiCapability = (typeof AI_CAPABILITY_VALUES)[number];

export type AiCapabilitySettings = {
  creativeEnabled: boolean;
  organizationalEnabled: boolean;
};

type ProfileAiCapabilityRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "ai_creative_enabled" | "ai_organizational_enabled"
>;

export const DEFAULT_AI_CAPABILITY_SETTINGS: AiCapabilitySettings = {
  creativeEnabled: true,
  organizationalEnabled: true,
};

export function normalizeAiCapabilitySettings(
  row: Partial<ProfileAiCapabilityRow> | null | undefined
): AiCapabilitySettings {
  return {
    creativeEnabled:
      typeof row?.ai_creative_enabled === "boolean"
        ? row.ai_creative_enabled
        : DEFAULT_AI_CAPABILITY_SETTINGS.creativeEnabled,
    organizationalEnabled:
      typeof row?.ai_organizational_enabled === "boolean"
        ? row.ai_organizational_enabled
        : DEFAULT_AI_CAPABILITY_SETTINGS.organizationalEnabled,
  };
}

export function isAiCapabilityEnabled(
  settings: AiCapabilitySettings,
  capability: AiCapability
) {
  return capability === "creative"
    ? settings.creativeEnabled
    : settings.organizationalEnabled;
}

export function getAiCapabilityLabel(capability: AiCapability) {
  return capability === "creative" ? "Creative AI" : "Organizational AI";
}

export function getAiCapabilityDisabledMessage(capability: AiCapability) {
  return `${getAiCapabilityLabel(capability)} is turned off in Profile > AI access.`;
}

export function getAiCapabilityForSessionType(
  sessionType: AiSessionType
): AiCapability | null {
  switch (sessionType) {
    case "brain_dump":
    case "brainstorm":
    case "editing":
    case "drafting":
      return "creative";
    case "manuscript_import":
    case "summary":
      return "organizational";
    default:
      return null;
  }
}
