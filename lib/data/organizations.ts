import "client-only";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";
import {
  buildOrganizationDocument,
  coerceOrganizationCanonLevel,
  coerceOrganizationConfidence,
  coerceOrganizationStatus,
  coerceOrganizationType,
  slugifyOrganizationName,
  type NormalizedOrganizationFormValues,
  type Organization,
} from "@/types/organization";

type OrganizationRow = Database["public"]["Tables"]["organizations"]["Row"];

export async function getOrganizationsForProject(uid: string, projectId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId);

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => normalizeOrganizationRow(row as OrganizationRow))
    .sort(compareOrganizations);
}

export async function getOrganizationById(
  uid: string,
  projectId: string,
  organizationId: string
) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", organizationId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeOrganizationRow(data as OrganizationRow) : null;
}

export async function createOrganizationForProject(
  uid: string,
  projectId: string,
  values: NormalizedOrganizationFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Organization name is required.");
  }

  const organizationId = await getAvailableOrganizationId(uid, projectId, name);
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();
  const organizationDocument = buildOrganizationDocument({
    id: organizationId,
    projectId,
    values,
  });

  const { error } = await supabase.from("organizations").insert({
    user_id: uid,
    project_id: projectId,
    id: organizationId,
    name: organizationDocument.name,
    slug: organizationDocument.slug,
    summary: organizationDocument.summary,
    description: organizationDocument.description,
    status: organizationDocument.status,
    tags: organizationDocument.tags,
    is_archived: organizationDocument.isArchived,
    canon_level: organizationDocument.canonLevel,
    confidence: organizationDocument.confidence,
    organization_type: organizationDocument.organizationType,
    founded_year: organizationDocument.foundedYear,
    base_location_ids: organizationDocument.baseLocationIds,
    leader_titles: organizationDocument.leaderTitles,
    member_count_estimate: organizationDocument.memberCountEstimate,
    goals: organizationDocument.goals,
    resources: organizationDocument.resources,
    alliances: organizationDocument.alliances,
    rivals: organizationDocument.rivals,
    public_wiki_summary: organizationDocument.publicWikiSummary,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw error;
  }

  return organizationId;
}

export async function updateOrganizationForProject(
  uid: string,
  projectId: string,
  organizationId: string,
  values: NormalizedOrganizationFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Organization name is required.");
  }

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      name,
      slug: slugifyOrganizationName(name),
      summary: values.summary,
      description: values.description,
      status: values.status,
      is_archived: values.status === "archived",
      organization_type: values.organizationType,
      founded_year: values.foundedYear,
      base_location_ids: values.baseLocationIds,
      leader_titles: values.leaderTitles,
      member_count_estimate: values.memberCountEstimate,
      goals: values.goals,
      resources: values.resources,
      alliances: values.alliances,
      public_wiki_summary: values.publicWikiSummary,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", organizationId);

  if (error) {
    throw error;
  }
}

async function getAvailableOrganizationId(uid: string, projectId: string, name: string) {
  const baseId = buildOrganizationId(name);
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("organizations")
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

function normalizeOrganizationRow(row: OrganizationRow): Organization {
  const status = coerceOrganizationStatus(row.status);

  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    slug: row.slug || slugifyOrganizationName(row.name),
    summary: row.summary || "",
    description: row.description || "",
    status,
    tags: row.tags ?? [],
    isArchived: row.is_archived ?? status === "archived",
    canonLevel: coerceOrganizationCanonLevel(row.canon_level),
    confidence: coerceOrganizationConfidence(row.confidence),
    organizationType: coerceOrganizationType(row.organization_type),
    foundedYear: row.founded_year,
    baseLocationIds: row.base_location_ids ?? [],
    leaderTitles: row.leader_titles ?? [],
    memberCountEstimate: row.member_count_estimate,
    goals: row.goals ?? [],
    resources: row.resources ?? [],
    alliances: row.alliances ?? [],
    rivals: row.rivals ?? [],
    publicWikiSummary: row.public_wiki_summary || "",
    createdAt: readDateOrNull(row.created_at),
    updatedAt: readDateOrNull(row.updated_at),
  };
}

function buildOrganizationId(name: string) {
  const normalized = slugifyOrganizationName(name).replace(/-/g, "_");
  return `organization_${normalized || "organization"}`;
}

function compareOrganizations(left: Organization, right: Organization) {
  return left.name.localeCompare(right.name);
}

function readDateOrNull(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
