import { NextResponse } from "next/server";

import {
  getAiCapabilityDisabledMessage,
  isAiCapabilityEnabled,
  normalizeAiCapabilitySettings,
  type AiCapability,
  type AiCapabilitySettings,
} from "@/lib/ai/capabilities";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type ServerSupabase = Awaited<ReturnType<typeof getSupabaseServerClient>>;

export async function readProfileAiCapabilitySettings(
  supabase: ServerSupabase,
  uid: string
): Promise<{ error: string | null; settings: AiCapabilitySettings }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("ai_creative_enabled, ai_organizational_enabled")
    .eq("id", uid)
    .maybeSingle();

  if (error) {
    return {
      error: error.message,
      settings: normalizeAiCapabilitySettings(null),
    };
  }

  return {
    error: null,
    settings: normalizeAiCapabilitySettings(data),
  };
}

export async function enforceProfileAiCapability(
  supabase: ServerSupabase,
  uid: string,
  capability: AiCapability
) {
  const { error, settings } = await readProfileAiCapabilitySettings(supabase, uid);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  if (!isAiCapabilityEnabled(settings, capability)) {
    return NextResponse.json(
      {
        error: getAiCapabilityDisabledMessage(capability),
      },
      { status: 403 }
    );
  }

  return null;
}
