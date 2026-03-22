import "client-only";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";
import {
  buildEraDocument,
  coerceEraCanonLevel,
  coerceEraConfidence,
  coerceEraStatus,
  slugifyEraName,
  type Era,
  type NormalizedEraFormValues,
} from "@/types/era";

type EraRow = Database["public"]["Tables"]["eras"]["Row"];

export async function getErasForProject(uid: string, projectId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("eras")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => normalizeEraRow(row as EraRow)).sort(compareEras);
}

export async function getEraById(uid: string, projectId: string, eraId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("eras")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", eraId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeEraRow(data as EraRow) : null;
}

export async function createEraForProject(
  uid: string,
  projectId: string,
  values: NormalizedEraFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Era name is required.");
  }

  const eraId = await getAvailableEraId(uid, projectId, name);
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();
  const eraDocument = buildEraDocument({
    id: eraId,
    projectId,
    values,
  });

  const { error } = await supabase.from("eras").insert({
    user_id: uid,
    project_id: projectId,
    id: eraId,
    name: eraDocument.name,
    slug: eraDocument.slug,
    summary: eraDocument.summary,
    description: eraDocument.description,
    status: eraDocument.status,
    tags: eraDocument.tags,
    is_archived: eraDocument.isArchived,
    canon_level: eraDocument.canonLevel,
    confidence: eraDocument.confidence,
    start_year: eraDocument.startYear,
    end_year: eraDocument.endYear,
    defining_events: eraDocument.definingEvents,
    key_locations: eraDocument.keyLocations,
    key_factions: eraDocument.keyFactions,
    dominant_themes: eraDocument.dominantThemes,
    public_wiki_summary: eraDocument.publicWikiSummary,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw error;
  }

  return eraId;
}

export async function updateEraForProject(
  uid: string,
  projectId: string,
  eraId: string,
  values: NormalizedEraFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Era name is required.");
  }

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("eras")
    .update({
      name,
      slug: slugifyEraName(name),
      summary: values.summary,
      description: values.description,
      status: values.status,
      is_archived: values.status === "archived",
      start_year: values.startYear,
      end_year: values.endYear,
      defining_events: values.definingEvents,
      key_locations: values.keyLocations,
      key_factions: values.keyFactions,
      dominant_themes: values.dominantThemes,
      public_wiki_summary: values.publicWikiSummary,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", eraId);

  if (error) {
    throw error;
  }
}

async function getAvailableEraId(uid: string, projectId: string, name: string) {
  const baseId = buildEraId(name);
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("eras")
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

function normalizeEraRow(row: EraRow): Era {
  const status = coerceEraStatus(row.status);

  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    slug: row.slug || slugifyEraName(row.name),
    summary: row.summary || "",
    description: row.description || "",
    status,
    tags: row.tags ?? [],
    isArchived: row.is_archived ?? status === "archived",
    canonLevel: coerceEraCanonLevel(row.canon_level),
    confidence: coerceEraConfidence(row.confidence),
    startYear: row.start_year,
    endYear: row.end_year,
    definingEvents: row.defining_events ?? [],
    keyLocations: row.key_locations ?? [],
    keyFactions: row.key_factions ?? [],
    dominantThemes: row.dominant_themes ?? [],
    publicWikiSummary: row.public_wiki_summary || "",
    createdAt: readDateOrNull(row.created_at),
    updatedAt: readDateOrNull(row.updated_at),
  };
}

function buildEraId(name: string) {
  const normalized = slugifyEraName(name).replace(/-/g, "_");
  return `era_${normalized || "era"}`;
}

function compareEras(left: Era, right: Era) {
  const leftStartYear = left.startYear;
  const rightStartYear = right.startYear;

  if (typeof leftStartYear === "number" && typeof rightStartYear === "number") {
    if (leftStartYear !== rightStartYear) {
      return leftStartYear - rightStartYear;
    }
  } else if (typeof leftStartYear === "number") {
    return -1;
  } else if (typeof rightStartYear === "number") {
    return 1;
  }

  const leftEndYear = left.endYear;
  const rightEndYear = right.endYear;

  if (typeof leftEndYear === "number" && typeof rightEndYear === "number") {
    if (leftEndYear !== rightEndYear) {
      return leftEndYear - rightEndYear;
    }
  } else if (typeof leftEndYear === "number") {
    return -1;
  } else if (typeof rightEndYear === "number") {
    return 1;
  }

  return left.name.localeCompare(right.name);
}

function readDateOrNull(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
