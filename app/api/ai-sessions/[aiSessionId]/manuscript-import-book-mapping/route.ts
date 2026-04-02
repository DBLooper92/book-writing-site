import { NextResponse } from "next/server";

import { enforceProfileAiCapability } from "@/lib/server/profile-ai-capabilities";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeManuscriptImportWorkflowState } from "@/types/ai-manuscript-import";
import { buildBookDocument } from "@/types/book";

type RouteContext = {
  params: Promise<{
    aiSessionId: string;
  }>;
};

type MappingInput = {
  importBookId: string;
  suggestedAction: "create" | "update";
  targetBookId: string | null;
  targetBookTitle: string;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { aiSessionId } = await context.params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Sign in before mapping imported books." },
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

  let input: MappingInput;

  try {
    input = normalizeMappingInput(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Invalid book mapping request.",
      },
      { status: 400 }
    );
  }

  const { data: aiSession, error: aiSessionError } = await supabase
    .from("ai_sessions")
    .select("id, project_id, session_type, workflow_state")
    .eq("user_id", user.id)
    .eq("id", aiSessionId)
    .maybeSingle();

  if (aiSessionError) {
    return NextResponse.json({ error: aiSessionError.message }, { status: 500 });
  }

  if (!aiSession || aiSession.session_type !== "manuscript_import") {
    return NextResponse.json({ error: "Manuscript import session not found." }, { status: 404 });
  }

  const workflowState = normalizeManuscriptImportWorkflowState(aiSession.workflow_state);

  if (!workflowState) {
    return NextResponse.json(
      { error: "This AI session does not contain manuscript import workflow state." },
      { status: 400 }
    );
  }

  const book = workflowState.books.find((entry) => entry.importBookId === input.importBookId);

  if (!book) {
    return NextResponse.json({ error: "Imported book not found." }, { status: 404 });
  }

  if (book.parseStatus !== "parsed") {
    return NextResponse.json(
      { error: "Only successfully parsed manuscript files can be mapped." },
      { status: 400 }
    );
  }

  const { data: existingBooks, error: booksError } = await supabase
    .from("books")
    .select("id, title")
    .eq("user_id", user.id)
    .eq("project_id", aiSession.project_id);

  if (booksError) {
    return NextResponse.json({ error: booksError.message }, { status: 500 });
  }

  let targetBookId = input.targetBookId;

  if (input.suggestedAction === "update") {
    if (!targetBookId) {
      return NextResponse.json(
        { error: "Select an existing book when using update mapping." },
        { status: 400 }
      );
    }

    const targetBook = (existingBooks ?? []).find((entry) => entry.id === targetBookId);

    if (!targetBook) {
      return NextResponse.json({ error: "Selected book not found." }, { status: 404 });
    }
  } else {
    if (targetBookId) {
      const targetBook = (existingBooks ?? []).find((entry) => entry.id === targetBookId);

      if (!targetBook) {
        return NextResponse.json(
          { error: "Selected created book is no longer available." },
          { status: 404 }
        );
      }
    } else {
      targetBookId = await createMinimalBook({
        supabase,
        uid: user.id,
        projectId: aiSession.project_id,
        title: input.targetBookTitle,
      });
    }
  }

  const nextBooks = workflowState.books.map((entry) =>
    entry.importBookId === input.importBookId
      ? {
          ...entry,
          status: "ready_to_process" as const,
          lastError: "",
          mapping: {
            ...entry.mapping,
            mappingStatus: "saved" as const,
            suggestedAction: input.suggestedAction,
            targetBookId,
            targetBookTitle: input.targetBookTitle,
            matchedRecord:
              entry.mapping.matchCandidates.find((candidate) => candidate.recordId === targetBookId) ??
              entry.mapping.matchedRecord,
          },
        }
      : entry
  );

  const readyCount = nextBooks.filter((entry) => entry.mapping.mappingStatus === "saved").length;
  const parsedCount = nextBooks.filter((entry) => entry.parseStatus === "parsed").length;
  const nextWorkflowState = {
    ...workflowState,
    stage: readyCount === parsedCount ? "ready_to_process" : "mapping",
    books: nextBooks,
  };

  const { error: updateError } = await supabase
    .from("ai_sessions")
    .update({
      workflow_state: nextWorkflowState,
      output_summary: `${readyCount} of ${parsedCount} imported books mapped`,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("project_id", aiSession.project_id)
    .eq("id", aiSessionId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    workflowState: nextWorkflowState,
  });
}

function normalizeMappingInput(value: unknown): MappingInput {
  if (!isRecord(value)) {
    throw new Error("A JSON body is required.");
  }

  const importBookId = typeof value.importBookId === "string" ? value.importBookId.trim() : "";

  if (!importBookId) {
    throw new Error("Imported book ID is required.");
  }

  const suggestedAction = value.suggestedAction === "update" ? "update" : "create";
  const targetBookTitle =
    typeof value.targetBookTitle === "string" ? value.targetBookTitle.trim() : "";

  if (!targetBookTitle) {
    throw new Error("A target book title is required.");
  }

  return {
    importBookId,
    suggestedAction,
    targetBookId:
      typeof value.targetBookId === "string" && value.targetBookId.trim()
        ? value.targetBookId.trim()
        : null,
    targetBookTitle,
  };
}

async function createMinimalBook({
  supabase,
  uid,
  projectId,
  title,
}: {
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  uid: string;
  projectId: string;
  title: string;
}) {
  const { data: existingBooks, error: booksError } = await supabase
    .from("books")
    .select("id")
    .eq("user_id", uid)
    .eq("project_id", projectId);

  if (booksError) {
    throw new Error(booksError.message);
  }

  const bookId = getAvailableBookId(title, (existingBooks ?? []).map((row) => row.id));
  const bookDocument = buildBookDocument({
    id: bookId,
    projectId,
    values: {
      title,
      summary: "",
      description: "",
      status: "planning",
      seriesOrder: null,
      premise: "",
      draftStage: "outline",
      wordCountTarget: null,
      internalChronologyStart: null,
      internalChronologyEnd: null,
      publicWikiSummary: "",
    },
  });

  const now = new Date().toISOString();
  const { error: insertError } = await supabase.from("books").insert({
    user_id: uid,
    project_id: projectId,
    id: bookDocument.id,
    title: bookDocument.title,
    slug: bookDocument.slug,
    summary: bookDocument.summary,
    description: bookDocument.description,
    status: bookDocument.status,
    tags: bookDocument.tags,
    is_archived: bookDocument.isArchived,
    canon_level: bookDocument.canonLevel,
    confidence: bookDocument.confidence,
    series_order: bookDocument.seriesOrder,
    internal_chronology_start: bookDocument.internalChronologyStart,
    internal_chronology_end: bookDocument.internalChronologyEnd,
    premise: bookDocument.premise,
    draft_stage: bookDocument.draftStage,
    word_count_target: bookDocument.wordCountTarget,
    word_count_current: bookDocument.wordCountCurrent,
    primary_themes: bookDocument.primaryThemes,
    main_characters: bookDocument.mainCharacters,
    key_locations: bookDocument.keyLocations,
    related_plot_threads: bookDocument.relatedPlotThreads,
    chapter_ids: bookDocument.chapterIds,
    scene_ids: bookDocument.sceneIds,
    timeline_event_ids: bookDocument.timelineEventIds,
    public_wiki_summary: bookDocument.publicWikiSummary,
    created_at: now,
    updated_at: now,
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  return bookId;
}

function getAvailableBookId(title: string, existingIds: string[]) {
  const normalizedBase =
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "book";
  const baseId = `book_${normalizedBase}`;
  const existing = new Set(existingIds);
  let candidate = baseId;
  let suffix = 2;

  while (existing.has(candidate)) {
    candidate = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
