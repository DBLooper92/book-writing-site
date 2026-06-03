import "client-only";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";
import {
  buildRetconDocument,
  coerceRetconCanonLevel,
  coerceRetconConfidence,
  coerceRetconImpactLevel,
  coerceRetconStatus,
  slugifyRetconTitle,
  type NormalizedRetconFormValues,
  type Retcon,
} from "@/types/retcon";

type RetconRow = Database["public"]["Tables"]["retcons"]["Row"];

export async function getRetconsForProject(uid: string, projectId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("retcons")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => normalizeRetconRow(row as RetconRow)).sort(compareRetcons);
}

export async function getRetconById(uid: string, projectId: string, retconId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("retcons")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", retconId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeRetconRow(data as RetconRow) : null;
}

export async function createRetconForProject(
  uid: string,
  projectId: string,
  values: NormalizedRetconFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Retcon title is required.");
  }

  const retconId = await getAvailableRetconId(uid, projectId, title);
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();
  const retconDocument = buildRetconDocument({
    id: retconId,
    projectId,
    values,
  });

  const { error } = await supabase.from("retcons").insert({
    user_id: uid,
    project_id: projectId,
    id: retconId,
    title: retconDocument.title,
    slug: retconDocument.slug,
    summary: retconDocument.summary,
    description: retconDocument.description,
    status: retconDocument.status,
    tags: retconDocument.tags,
    is_archived: retconDocument.isArchived,
    canon_level: retconDocument.canonLevel,
    confidence: retconDocument.confidence,
    old_canon: retconDocument.oldCanon,
    new_canon: retconDocument.newCanon,
    reason: retconDocument.reason,
    impact_level: retconDocument.impactLevel,
    affected_entity_types: retconDocument.affectedEntityTypes,
    affected_entity_ids: retconDocument.affectedEntityIds,
    resolved: retconDocument.resolved,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw error;
  }

  return retconId;
}

export async function updateRetconForProject(
  uid: string,
  projectId: string,
  retconId: string,
  values: NormalizedRetconFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Retcon title is required.");
  }

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("retcons")
    .update({
      title,
      slug: slugifyRetconTitle(title),
      summary: values.summary,
      description: values.description,
      status: values.status,
      is_archived: values.status === "archived",
      old_canon: values.oldCanon,
      new_canon: values.newCanon,
      reason: values.reason,
      impact_level: values.impactLevel,
      affected_entity_types: values.affectedEntityTypes,
      affected_entity_ids: values.affectedEntityIds,
      resolved: values.resolved,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", retconId);

  if (error) {
    throw error;
  }
}

async function getAvailableRetconId(uid: string, projectId: string, title: string) {
  const baseId = buildRetconId(title);
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("retcons")
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

function normalizeRetconRow(row: RetconRow): Retcon {
  const status = coerceRetconStatus(row.status);

  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    slug: row.slug || slugifyRetconTitle(row.title),
    summary: row.summary || "",
    description: row.description || "",
    status,
    tags: row.tags ?? [],
    isArchived: row.is_archived ?? status === "archived",
    canonLevel: coerceRetconCanonLevel(row.canon_level),
    confidence: coerceRetconConfidence(row.confidence),
    oldCanon: row.old_canon || "",
    newCanon: row.new_canon || "",
    reason: row.reason || "",
    impactLevel: coerceRetconImpactLevel(row.impact_level),
    affectedEntityTypes: row.affected_entity_types ?? [],
    affectedEntityIds: row.affected_entity_ids ?? [],
    resolved: row.resolved ?? status === "resolved",
    createdAt: readDateOrNull(row.created_at),
    updatedAt: readDateOrNull(row.updated_at),
  };
}

function buildRetconId(title: string) {
  const normalized = slugifyRetconTitle(title).replace(/-/g, "_");
  return `retcon_${normalized || "retcon"}`;
}

function compareRetcons(left: Retcon, right: Retcon) {
  return left.title.localeCompare(right.title);
}

function readDateOrNull(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
