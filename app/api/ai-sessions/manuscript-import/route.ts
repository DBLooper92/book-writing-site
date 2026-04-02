import { NextResponse } from "next/server";

import { createEmptyManuscriptImportWorkflowState } from "@/types/ai-manuscript-import";
import { buildAiSessionIdFromTitle, slugifyAiSessionTitle } from "@/types/ai-session";
import { enforceProfileAiCapability } from "@/lib/server/profile-ai-capabilities";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  normalizeManuscriptImportCreateInput,
  validateManuscriptImportCreateInput,
} from "@/lib/ai/manuscript-import";
import type { Database } from "@/types/database";

type AiSessionInsert = Database["public"]["Tables"]["ai_sessions"]["Insert"];

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Sign in before starting a manuscript import." },
      { status: 401 }
    );
  }

  const capabilityErrorResponse = await enforceProfileAiCapability(
    supabase,
    user.id,
    "organizational"
  );

  if (capabilityErrorResponse) {
    return capabilityErrorResponse;
  }

  const body = await request.json().catch(() => null);
  const input = normalizeManuscriptImportCreateInput(body);
  const projectId = typeof body?.projectId === "string" ? body.projectId.trim() : "";

  try {
    validateManuscriptImportCreateInput(input);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Invalid manuscript import request.",
      },
      { status: 400 }
    );
  }

  if (!projectId) {
    return NextResponse.json({ error: "Active project context is required." }, { status: 400 });
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", user.id)
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    return NextResponse.json({ error: projectError.message }, { status: 500 });
  }

  if (!project) {
    return NextResponse.json({ error: "Active project not found." }, { status: 404 });
  }

  const aiSessionId = await getAvailableAiSessionId(supabase, user.id, projectId, input.title);
  const now = new Date().toISOString();
  const insertRow: AiSessionInsert = {
    user_id: user.id,
    project_id: projectId,
    id: aiSessionId,
    title: input.title,
    slug: slugifyAiSessionTitle(input.title),
    summary: "Manuscript import session created.",
    description: input.purpose || "AI-assisted manuscript import session.",
    status: "in_progress",
    tags: [],
    is_archived: false,
    canon_level: "working",
    confidence: "medium",
    session_type: "manuscript_import",
    provider: "openai",
    model: "gpt-5-mini",
    purpose: input.purpose,
    prompt_excerpt: "",
    output_summary: "",
    source_text: "",
    source_guidance: input.guidance,
    extraction_status: "not_requested",
    extraction_error: "",
    extraction_model: "",
    extraction_result: null,
    workflow_state: createEmptyManuscriptImportWorkflowState(input.importMode),
    linked_entity_types: [],
    linked_entity_ids: [],
    messages_count: 0,
    created_at: now,
    updated_at: now,
  };

  const { error: insertError } = await supabase.from("ai_sessions").insert(insertRow);

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ aiSessionId });
}

async function getAvailableAiSessionId(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  uid: string,
  projectId: string,
  title: string
) {
  const baseId = buildAiSessionIdFromTitle(title);
  const { data, error } = await supabase
    .from("ai_sessions")
    .select("id")
    .eq("user_id", uid)
    .eq("project_id", projectId);

  if (error) {
    throw new Error(error.message);
  }

  const existingIds = new Set((data ?? []).map((row) => row.id));
  let candidateId = baseId;
  let suffix = 2;

  while (existingIds.has(candidateId)) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}
