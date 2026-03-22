import "client-only";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database, Json } from "@/types/database";
import { upsertUserProfile, type ProfileOwnerContext } from "@/lib/data/profiles";

export type ProjectOwnerContext = ProfileOwnerContext;

export type UserProject = {
  id: string;
  title: string;
  slug: string | null;
  summary: string | null;
  status: string;
};

export type ProjectRecord = {
  id: string;
  userId: string;
  ownerId: string;
  title: string;
  slug: string | null;
  summary: string | null;
  description: string | null;
  genre: string | null;
  tone: string | null;
  themes: string[];
  timelineStartYear: number | null;
  timelineEndYear: number | null;
  defaultCalendarSystemId: string | null;
  primaryPointOfViewStyle: string | null;
  writingStatus: string | null;
  bookOrderMode: string | null;
  notesRootId: string | null;
  settings: Json;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];

export async function listUserProjects(uid: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, title, slug, summary, status")
    .eq("user_id", uid)
    .order("title", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((project) => ({
    id: project.id,
    title: project.title,
    slug: project.slug,
    summary: project.summary,
    status: project.status,
  })) satisfies UserProject[];
}

export async function getProjectById(uid: string, projectId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", uid)
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeProjectRow(data as ProjectRow) : null;
}

export async function getActiveProjectId(uid: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("active_project_id")
    .eq("id", uid)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.active_project_id ?? null;
}

export async function setActiveProjectForUser(uid: string, projectId: string) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      active_project_id: projectId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", uid);

  if (error) {
    throw error;
  }
}

export async function createProjectForUser(
  owner: ProjectOwnerContext,
  title: string
) {
  const normalizedTitle = title.trim();

  if (!normalizedTitle) {
    throw new Error("Enter a project name.");
  }

  await upsertUserProfile(owner);

  const projectId = await getAvailableProjectId(owner.uid, slugify(normalizedTitle));
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();
  const { error } = await supabase.from("projects").insert({
    id: projectId,
    user_id: owner.uid,
    owner_id: owner.uid,
    title: normalizedTitle,
    slug: projectId,
    summary: `Story bible project for ${normalizedTitle}.`,
    description: `Project workspace for ${normalizedTitle}.`,
    genre: "Unassigned",
    tone: "Undecided",
    themes: [],
    timeline_start_year: null,
    timeline_end_year: null,
    default_calendar_system_id: "calendar_standard_solar",
    primary_point_of_view_style: "Undecided",
    writing_status: "planning",
    book_order_mode: "series-order",
    notes_root_id: null,
    settings: {
      allowPublicWiki: false,
      allowAIWriting: true,
      allowAIEditing: true,
      defaultTimelineScale: "year",
      defaultLanguageId: null,
      spoilerPolicy: "internal-only",
    },
    status: "active",
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw error;
  }

  await setActiveProjectForUser(owner.uid, projectId);

  return projectId;
}

export async function renameProjectForUser(
  uid: string,
  projectId: string,
  title: string
) {
  const normalizedTitle = title.trim();

  if (!normalizedTitle) {
    throw new Error("Project name cannot be empty.");
  }

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("projects")
    .update({
      title: normalizedTitle,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid)
    .eq("id", projectId);

  if (error) {
    throw error;
  }
}

async function getAvailableProjectId(uid: string, baseSlug: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", uid);

  if (error) {
    throw error;
  }

  const existingIds = new Set((data ?? []).map((project) => project.id));
  let candidate = baseSlug;
  let suffix = 2;

  while (existingIds.has(candidate)) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function normalizeProjectRow(row: ProjectRow): ProjectRecord {
  return {
    id: row.id,
    userId: row.user_id,
    ownerId: row.owner_id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    description: row.description,
    genre: row.genre,
    tone: row.tone,
    themes: row.themes,
    timelineStartYear: row.timeline_start_year,
    timelineEndYear: row.timeline_end_year,
    defaultCalendarSystemId: row.default_calendar_system_id,
    primaryPointOfViewStyle: row.primary_point_of_view_style,
    writingStatus: row.writing_status,
    bookOrderMode: row.book_order_mode,
    notesRootId: row.notes_root_id,
    settings: row.settings,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "project";
}
