import "client-only";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";
import {
  getManuscriptRecordId,
  type ManuscriptRecord,
} from "@/lib/manuscript/workspace";

type ManuscriptRow = Database["public"]["Tables"]["manuscripts"]["Row"];

export async function getManuscriptsForProject(uid: string, projectId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("manuscripts")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .order("chapter_number", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => normalizeManuscriptRow(row as ManuscriptRow));
}

export async function upsertManuscriptForProject(
  uid: string,
  projectId: string,
  input: {
    bodyText: string;
    bookId: string;
    chapterId: string | null;
    chapterNumber: number;
    chapterTitle: string;
  }
) {
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();
  const manuscriptId = getManuscriptRecordId(input.bookId, input.chapterNumber);
  const existingResult = await supabase
    .from("manuscripts")
    .select("created_at")
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", manuscriptId)
    .maybeSingle();

  if (existingResult.error) {
    throw existingResult.error;
  }

  const { error } = await supabase.from("manuscripts").upsert({
    user_id: uid,
    project_id: projectId,
    id: manuscriptId,
    book_id: input.bookId,
    chapter_number: input.chapterNumber,
    chapter_id: input.chapterId,
    chapter_title: input.chapterTitle,
    body_text: input.bodyText,
    updated_at: now,
    created_at: existingResult.data?.created_at ?? now,
  });

  if (error) {
    throw error;
  }

  return {
    id: manuscriptId,
    bookId: input.bookId,
    chapterNumber: input.chapterNumber,
    chapterId: input.chapterId,
    chapterTitle: input.chapterTitle,
    bodyText: input.bodyText,
    createdAt: existingResult.data?.created_at ?? now,
    updatedAt: now,
  } satisfies ManuscriptRecord;
}

function normalizeManuscriptRow(row: ManuscriptRow): ManuscriptRecord {
  return {
    id: row.id,
    bookId: row.book_id,
    chapterNumber: row.chapter_number,
    chapterId: row.chapter_id,
    chapterTitle: row.chapter_title,
    bodyText: row.body_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
