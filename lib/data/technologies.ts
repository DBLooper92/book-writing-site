import "client-only";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";
import {
  buildTechnologyDocument,
  coerceTechnologyCanonLevel,
  coerceTechnologyConfidence,
  coerceTechnologyStatus,
  slugifyTechnologyName,
  type NormalizedTechnologyFormValues,
  type Technology,
} from "@/types/technology";

type TechnologyRow = Database["public"]["Tables"]["technologies"]["Row"];

export async function getTechnologiesForProject(uid: string, projectId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("technologies")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId);

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => normalizeTechnologyRow(row as TechnologyRow))
    .sort(compareTechnologies);
}

export async function getTechnologyById(
  uid: string,
  projectId: string,
  technologyId: string
) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("technologies")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", technologyId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeTechnologyRow(data as TechnologyRow) : null;
}

export async function createTechnologyForProject(
  uid: string,
  projectId: string,
  values: NormalizedTechnologyFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Technology name is required.");
  }

  const technologyId = await getAvailableTechnologyId(uid, projectId, name);
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();
  const technologyDocument = buildTechnologyDocument({
    id: technologyId,
    projectId,
    values,
  });

  const { error } = await supabase.from("technologies").insert({
    user_id: uid,
    project_id: projectId,
    id: technologyId,
    name: technologyDocument.name,
    slug: technologyDocument.slug,
    summary: technologyDocument.summary,
    description: technologyDocument.description,
    status: technologyDocument.status,
    tags: technologyDocument.tags,
    is_archived: technologyDocument.isArchived,
    canon_level: technologyDocument.canonLevel,
    confidence: technologyDocument.confidence,
    technology_type: technologyDocument.technologyType,
    invented_year: technologyDocument.inventedYear,
    inventor_notes: technologyDocument.inventorNotes,
    power_source: technologyDocument.powerSource,
    limitations: technologyDocument.limitations,
    associated_location_ids: technologyDocument.associatedLocationIds,
    associated_faction_ids: technologyDocument.associatedFactionIds,
    timeline_event_ids: technologyDocument.timelineEventIds,
    public_wiki_summary: technologyDocument.publicWikiSummary,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw error;
  }

  return technologyId;
}

export async function updateTechnologyForProject(
  uid: string,
  projectId: string,
  technologyId: string,
  values: NormalizedTechnologyFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Technology name is required.");
  }

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("technologies")
    .update({
      name,
      slug: slugifyTechnologyName(name),
      summary: values.summary,
      description: values.description,
      status: values.status,
      is_archived: values.status === "archived",
      technology_type: values.technologyType,
      invented_year: values.inventedYear,
      inventor_notes: values.inventorNotes,
      power_source: values.powerSource,
      limitations: values.limitations,
      associated_location_ids: values.associatedLocationIds,
      associated_faction_ids: values.associatedFactionIds,
      timeline_event_ids: values.timelineEventIds,
      public_wiki_summary: values.publicWikiSummary,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", technologyId);

  if (error) {
    throw error;
  }
}

async function getAvailableTechnologyId(
  uid: string,
  projectId: string,
  name: string
) {
  const baseId = buildTechnologyId(name);
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("technologies")
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

function normalizeTechnologyRow(row: TechnologyRow): Technology {
  const status = coerceTechnologyStatus(row.status);

  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    slug: row.slug || slugifyTechnologyName(row.name),
    summary: row.summary || "",
    description: row.description || "",
    status,
    tags: row.tags ?? [],
    isArchived: row.is_archived ?? status === "archived",
    canonLevel: coerceTechnologyCanonLevel(row.canon_level),
    confidence: coerceTechnologyConfidence(row.confidence),
    technologyType: row.technology_type || "technology",
    inventedYear: row.invented_year,
    inventorNotes: row.inventor_notes || "",
    powerSource: row.power_source || "",
    limitations: row.limitations ?? [],
    associatedLocationIds: row.associated_location_ids ?? [],
    associatedFactionIds: row.associated_faction_ids ?? [],
    timelineEventIds: row.timeline_event_ids ?? [],
    publicWikiSummary: row.public_wiki_summary || "",
    createdAt: readDateOrNull(row.created_at),
    updatedAt: readDateOrNull(row.updated_at),
  };
}

function buildTechnologyId(name: string) {
  const normalized = slugifyTechnologyName(name).replace(/-/g, "_");
  return `technology_${normalized || "technology"}`;
}

function compareTechnologies(left: Technology, right: Technology) {
  return left.name.localeCompare(right.name);
}

function readDateOrNull(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
