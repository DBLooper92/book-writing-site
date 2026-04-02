import { NextResponse } from "next/server";

import { normalizeAiCapabilitySettings } from "@/lib/ai/capabilities";
import { readProfileAiCapabilitySettings } from "@/lib/server/profile-ai-capabilities";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const authResult = await readAuthenticatedUser();

  if ("response" in authResult) {
    return authResult.response;
  }

  const { supabase, user } = authResult;
  const { error, settings } = await readProfileAiCapabilitySettings(supabase, user.id);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json(settings);
}

export async function PATCH(request: Request) {
  const authResult = await readAuthenticatedUser();

  if ("response" in authResult) {
    return authResult.response;
  }

  const { supabase, user } = authResult;
  const body = await request.json().catch(() => null);
  const creativeEnabled = body?.creativeEnabled;
  const organizationalEnabled = body?.organizationalEnabled;

  if (
    typeof creativeEnabled !== "boolean" ||
    typeof organizationalEnabled !== "boolean"
  ) {
    return NextResponse.json(
      {
        error:
          "Both creativeEnabled and organizationalEnabled must be provided as booleans.",
      },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      display_name: readDisplayName(user),
      role: "owner",
      plan: "personal",
      status: "active",
      ai_creative_enabled: creativeEnabled,
      ai_organizational_enabled: organizationalEnabled,
      updated_at: now,
    },
    {
      onConflict: "id",
    }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    normalizeAiCapabilitySettings({
      ai_creative_enabled: creativeEnabled,
      ai_organizational_enabled: organizationalEnabled,
    })
  );
}

async function readAuthenticatedUser() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      response: NextResponse.json(
        { error: "Sign in before managing AI access settings." },
        { status: 401 }
      ),
    };
  }

  return { supabase, user };
}

function readDisplayName(user: {
  user_metadata?: { display_name?: unknown; full_name?: unknown };
}) {
  const fullName = user.user_metadata?.full_name;

  if (typeof fullName === "string" && fullName.trim()) {
    return fullName.trim();
  }

  const displayName = user.user_metadata?.display_name;
  return typeof displayName === "string" && displayName.trim()
    ? displayName.trim()
    : null;
}
