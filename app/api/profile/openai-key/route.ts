import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  encryptProfileSecret,
  readSecretLast4,
} from "@/lib/security/profile-secrets";

export async function GET() {
  const authResult = await readAuthenticatedUser();

  if ("response" in authResult) {
    return authResult.response;
  }

  const { supabase, user } = authResult;
  const { data, error } = await supabase
    .from("profiles")
    .select("openai_api_key_last4, openai_api_key_updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    hasKey: !!data?.openai_api_key_last4,
    last4: data?.openai_api_key_last4 ?? null,
    updatedAt: data?.openai_api_key_updated_at ?? null,
  });
}

export async function PUT(request: Request) {
  const authResult = await readAuthenticatedUser();

  if ("response" in authResult) {
    return authResult.response;
  }

  const { supabase, user } = authResult;
  const body = await request.json().catch(() => null);
  const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";

  if (!apiKey) {
    return NextResponse.json({ error: "OpenAI API key is required." }, { status: 400 });
  }

  if (!apiKey.startsWith("sk-") || apiKey.length < 20) {
    return NextResponse.json({ error: "Enter a valid OpenAI API key." }, { status: 400 });
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
      openai_api_key_encrypted: encryptProfileSecret(apiKey),
      openai_api_key_last4: readSecretLast4(apiKey),
      openai_api_key_updated_at: now,
      updated_at: now,
    },
    {
      onConflict: "id",
    }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    hasKey: true,
    last4: readSecretLast4(apiKey),
    updatedAt: now,
  });
}

export async function DELETE() {
  const authResult = await readAuthenticatedUser();

  if ("response" in authResult) {
    return authResult.response;
  }

  const { supabase, user } = authResult;
  const { error } = await supabase
    .from("profiles")
    .update({
      openai_api_key_encrypted: null,
      openai_api_key_last4: null,
      openai_api_key_updated_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    hasKey: false,
    last4: null,
    updatedAt: null,
  });
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
        { error: "Sign in before managing API keys." },
        { status: 401 }
      ),
    };
  }

  return { supabase, user };
}

function readDisplayName(user: { user_metadata?: { full_name?: unknown; display_name?: unknown } }) {
  const fullName = user.user_metadata?.full_name;

  if (typeof fullName === "string" && fullName.trim()) {
    return fullName.trim();
  }

  const displayName = user.user_metadata?.display_name;
  return typeof displayName === "string" && displayName.trim() ? displayName.trim() : null;
}
