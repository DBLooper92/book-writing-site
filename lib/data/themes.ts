import "client-only";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";
import {
  buildThemeDocument,
  coerceThemeCanonLevel,
  coerceThemeConfidence,
  coerceThemeStatus,
  slugifyThemeName,
  type NormalizedThemeFormValues,
  type Theme,
} from "@/types/theme";

type ThemeRow = Database["public"]["Tables"]["themes"]["Row"];

export async function getThemesForProject(uid: string, projectId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("themes")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => normalizeThemeRow(row as ThemeRow)).sort(compareThemes);
}

export async function getThemeById(uid: string, projectId: string, themeId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("themes")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", themeId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeThemeRow(data as ThemeRow) : null;
}

export async function createThemeForProject(
  uid: string,
  projectId: string,
  values: NormalizedThemeFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Theme name is required.");
  }

  const themeId = await getAvailableThemeId(uid, projectId, name);
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();
  const themeDocument = buildThemeDocument({
    id: themeId,
    projectId,
    values,
  });

  const { error } = await supabase.from("themes").insert({
    user_id: uid,
    project_id: projectId,
    id: themeId,
    name: themeDocument.name,
    slug: themeDocument.slug,
    summary: themeDocument.summary,
    description: themeDocument.description,
    status: themeDocument.status,
    tags: themeDocument.tags,
    is_archived: themeDocument.isArchived,
    canon_level: themeDocument.canonLevel,
    confidence: themeDocument.confidence,
    central_question: themeDocument.centralQuestion,
    associated_book_ids: themeDocument.associatedBookIds,
    associated_character_ids: themeDocument.associatedCharacterIds,
    associated_timeline_event_ids: themeDocument.associatedTimelineEventIds,
    associated_era_ids: themeDocument.associatedEraIds,
    associated_plot_thread_ids: themeDocument.associatedPlotThreadIds,
    motifs: themeDocument.motifs,
    public_wiki_summary: themeDocument.publicWikiSummary,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw error;
  }

  return themeId;
}

export async function updateThemeForProject(
  uid: string,
  projectId: string,
  themeId: string,
  values: NormalizedThemeFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Theme name is required.");
  }

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("themes")
    .update({
      name,
      slug: slugifyThemeName(name),
      summary: values.summary,
      description: values.description,
      status: values.status,
      is_archived: values.status === "archived",
      central_question: values.centralQuestion,
      associated_book_ids: values.associatedBookIds,
      associated_character_ids: values.associatedCharacterIds,
      associated_timeline_event_ids: values.associatedTimelineEventIds,
      associated_era_ids: values.associatedEraIds,
      associated_plot_thread_ids: values.associatedPlotThreadIds,
      motifs: values.motifs,
      public_wiki_summary: values.publicWikiSummary,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", themeId);

  if (error) {
    throw error;
  }
}

async function getAvailableThemeId(uid: string, projectId: string, name: string) {
  const baseId = buildThemeId(name);
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("themes")
    .select("id")
    .eq("user_id", uid)
    .eq("project_id", projectId);

  if (error) {
    throw error;
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

function normalizeThemeRow(row: ThemeRow): Theme {
  const status = coerceThemeStatus(row.status);

  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    slug: row.slug || slugifyThemeName(row.name),
    summary: row.summary || "",
    description: row.description || "",
    status,
    tags: row.tags ?? [],
    isArchived: row.is_archived ?? status === "archived",
    canonLevel: coerceThemeCanonLevel(row.canon_level),
    confidence: coerceThemeConfidence(row.confidence),
    centralQuestion: row.central_question || "",
    associatedBookIds: row.associated_book_ids ?? [],
    associatedCharacterIds: row.associated_character_ids ?? [],
    associatedTimelineEventIds: row.associated_timeline_event_ids ?? [],
    associatedEraIds: row.associated_era_ids ?? [],
    associatedPlotThreadIds: row.associated_plot_thread_ids ?? [],
    motifs: row.motifs ?? [],
    publicWikiSummary: row.public_wiki_summary || "",
    createdAt: readDateOrNull(row.created_at),
    updatedAt: readDateOrNull(row.updated_at),
  };
}

function buildThemeId(name: string) {
  const normalized = slugifyThemeName(name).replace(/-/g, "_");
  return `theme_${normalized || "theme"}`;
}

function compareThemes(left: Theme, right: Theme) {
  return left.name.localeCompare(right.name);
}

function readDateOrNull(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
