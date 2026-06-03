import "client-only";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";
import {
  buildRelationshipDocument,
  coerceRelationshipCanonLevel,
  coerceRelationshipConfidence,
  coerceRelationshipEntityType,
  coerceRelationshipStatus,
  coerceRelationshipType,
  slugifyRelationshipTitle,
  type NormalizedRelationshipFormValues,
  type Relationship,
} from "@/types/relationship";

type RelationshipRow = Database["public"]["Tables"]["relationships"]["Row"];

export async function getRelationshipsForProject(uid: string, projectId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("relationships")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId);

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => normalizeRelationshipRow(row as RelationshipRow))
    .sort(compareRelationships);
}

export async function getRelationshipById(
  uid: string,
  projectId: string,
  relationshipId: string
) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("relationships")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", relationshipId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeRelationshipRow(data as RelationshipRow) : null;
}

export async function createRelationshipForProject(
  uid: string,
  projectId: string,
  values: NormalizedRelationshipFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Relationship title is required.");
  }

  const relationshipId = await getAvailableRelationshipId(uid, projectId, title);
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();
  const relationshipDocument = buildRelationshipDocument({
    id: relationshipId,
    projectId,
    values,
  });

  const { error } = await supabase.from("relationships").insert({
    user_id: uid,
    project_id: projectId,
    id: relationshipId,
    title: relationshipDocument.title,
    slug: relationshipDocument.slug,
    summary: relationshipDocument.summary,
    description: relationshipDocument.description,
    status: relationshipDocument.status,
    tags: relationshipDocument.tags,
    is_archived: relationshipDocument.isArchived,
    canon_level: relationshipDocument.canonLevel,
    confidence: relationshipDocument.confidence,
    relationship_type: relationshipDocument.relationshipType,
    entity_a_type: relationshipDocument.entityAType,
    entity_a_id: relationshipDocument.entityAId,
    entity_b_type: relationshipDocument.entityBType,
    entity_b_id: relationshipDocument.entityBId,
    dynamic_status: relationshipDocument.dynamicStatus,
    history: relationshipDocument.history,
    tensions: relationshipDocument.tensions,
    strengths: relationshipDocument.strengths,
    public_wiki_summary: relationshipDocument.publicWikiSummary,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw error;
  }

  return relationshipId;
}

export async function updateRelationshipForProject(
  uid: string,
  projectId: string,
  relationshipId: string,
  values: NormalizedRelationshipFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Relationship title is required.");
  }

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("relationships")
    .update({
      title,
      slug: slugifyRelationshipTitle(title),
      summary: values.summary,
      description: values.description,
      status: values.status,
      is_archived: values.status === "archived",
      relationship_type: values.relationshipType,
      entity_a_type: values.entityAType,
      entity_a_id: values.entityAId,
      entity_b_type: values.entityBType,
      entity_b_id: values.entityBId,
      dynamic_status: values.dynamicStatus,
      history: values.history,
      tensions: values.tensions,
      strengths: values.strengths,
      public_wiki_summary: values.publicWikiSummary,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", relationshipId);

  if (error) {
    throw error;
  }
}

async function getAvailableRelationshipId(uid: string, projectId: string, title: string) {
  const baseId = buildRelationshipId(title);
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("relationships")
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

function normalizeRelationshipRow(row: RelationshipRow): Relationship {
  const status = coerceRelationshipStatus(row.status);

  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    slug: row.slug || slugifyRelationshipTitle(row.title),
    summary: row.summary || "",
    description: row.description || "",
    status,
    tags: row.tags ?? [],
    isArchived: row.is_archived ?? status === "archived",
    canonLevel: coerceRelationshipCanonLevel(row.canon_level),
    confidence: coerceRelationshipConfidence(row.confidence),
    relationshipType: coerceRelationshipType(row.relationship_type),
    entityAType: coerceRelationshipEntityType(row.entity_a_type),
    entityAId: row.entity_a_id || "",
    entityBType: coerceRelationshipEntityType(row.entity_b_type),
    entityBId: row.entity_b_id || "",
    dynamicStatus: row.dynamic_status || "",
    history: row.history || "",
    tensions: row.tensions ?? [],
    strengths: row.strengths ?? [],
    publicWikiSummary: row.public_wiki_summary || "",
    createdAt: readDateOrNull(row.created_at),
    updatedAt: readDateOrNull(row.updated_at),
  };
}

function buildRelationshipId(title: string) {
  const normalized = slugifyRelationshipTitle(title).replace(/-/g, "_");
  return `relationship_${normalized || "relationship"}`;
}

function compareRelationships(left: Relationship, right: Relationship) {
  return left.title.localeCompare(right.title);
}

function readDateOrNull(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
