import "client-only";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";
import {
  buildSpeciesDocument,
  coerceSpeciesCanonLevel,
  coerceSpeciesConfidence,
  coerceSpeciesStatus,
  slugifySpeciesName,
  type NormalizedSpeciesFormValues,
  type Species,
} from "@/types/species";

type SpeciesRow = Database["public"]["Tables"]["species"]["Row"];

export async function getSpeciesForProject(uid: string, projectId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("species")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => normalizeSpeciesRow(row as SpeciesRow)).sort(compareSpecies);
}

export async function getSpeciesById(uid: string, projectId: string, speciesId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("species")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", speciesId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeSpeciesRow(data as SpeciesRow) : null;
}

export async function createSpeciesForProject(
  uid: string,
  projectId: string,
  values: NormalizedSpeciesFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Species name is required.");
  }

  const speciesId = await getAvailableSpeciesId(uid, projectId, name);
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();
  const speciesDocument = buildSpeciesDocument({
    id: speciesId,
    projectId,
    values,
  });

  const { error } = await supabase.from("species").insert({
    user_id: uid,
    project_id: projectId,
    id: speciesId,
    name: speciesDocument.name,
    slug: speciesDocument.slug,
    summary: speciesDocument.summary,
    description: speciesDocument.description,
    status: speciesDocument.status,
    tags: speciesDocument.tags,
    is_archived: speciesDocument.isArchived,
    canon_level: speciesDocument.canonLevel,
    confidence: speciesDocument.confidence,
    origin: speciesDocument.origin,
    lifespan: speciesDocument.lifespan,
    appearance: speciesDocument.appearance,
    biology: speciesDocument.biology,
    reproduction: speciesDocument.reproduction,
    diet: speciesDocument.diet,
    psychology: speciesDocument.psychology,
    social_structure: speciesDocument.socialStructure,
    abilities: speciesDocument.abilities,
    limitations: speciesDocument.limitations,
    notable_subgroups: speciesDocument.notableSubgroups,
    public_wiki_summary: speciesDocument.publicWikiSummary,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw error;
  }

  return speciesId;
}

export async function updateSpeciesForProject(
  uid: string,
  projectId: string,
  speciesId: string,
  values: NormalizedSpeciesFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Species name is required.");
  }

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("species")
    .update({
      name,
      slug: slugifySpeciesName(name),
      summary: values.summary,
      description: values.description,
      status: values.status,
      is_archived: values.status === "archived",
      origin: values.origin,
      lifespan: values.lifespan,
      appearance: values.appearance,
      biology: values.biology,
      reproduction: values.reproduction,
      diet: values.diet,
      psychology: values.psychology,
      social_structure: values.socialStructure,
      abilities: values.abilities,
      limitations: values.limitations,
      notable_subgroups: values.notableSubgroups,
      public_wiki_summary: values.publicWikiSummary,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", speciesId);

  if (error) {
    throw error;
  }
}

async function getAvailableSpeciesId(uid: string, projectId: string, name: string) {
  const baseId = buildSpeciesId(name);
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("species")
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

function normalizeSpeciesRow(row: SpeciesRow): Species {
  const status = coerceSpeciesStatus(row.status);

  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    slug: row.slug || slugifySpeciesName(row.name),
    summary: row.summary || "",
    description: row.description || "",
    status,
    tags: row.tags ?? [],
    isArchived: row.is_archived ?? status === "archived",
    canonLevel: coerceSpeciesCanonLevel(row.canon_level),
    confidence: coerceSpeciesConfidence(row.confidence),
    origin: row.origin || "",
    lifespan: row.lifespan || "",
    appearance: row.appearance || "",
    biology: row.biology || "",
    reproduction: row.reproduction || "",
    diet: row.diet || "",
    psychology: row.psychology || "",
    socialStructure: row.social_structure || "",
    abilities: row.abilities ?? [],
    limitations: row.limitations ?? [],
    notableSubgroups: row.notable_subgroups ?? [],
    publicWikiSummary: row.public_wiki_summary || "",
    createdAt: readDateOrNull(row.created_at),
    updatedAt: readDateOrNull(row.updated_at),
  };
}

function buildSpeciesId(name: string) {
  const normalized = slugifySpeciesName(name).replace(/-/g, "_");
  return `species_${normalized || "species"}`;
}

function compareSpecies(left: Species, right: Species) {
  return left.name.localeCompare(right.name);
}

function readDateOrNull(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
