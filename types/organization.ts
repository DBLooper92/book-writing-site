import type { AppTimestamp } from "@/types/timestamp";

export const ORGANIZATION_STATUS_VALUES = ["draft", "active", "archived"] as const;
export const ORGANIZATION_CANON_LEVEL_VALUES = [
  "core",
  "working",
  "draft",
  "non_canon",
] as const;
export const ORGANIZATION_CONFIDENCE_VALUES = [
  "low",
  "medium",
  "high",
  "confirmed",
] as const;
export const ORGANIZATION_TYPE_VALUES = [
  "scholarly_archive",
  "civic_institution",
  "guild",
  "religious_order",
  "merchant_company",
  "military_order",
  "secret_society",
  "academic_institution",
  "other",
] as const;

export type OrganizationStatus = (typeof ORGANIZATION_STATUS_VALUES)[number];
export type OrganizationCanonLevel = (typeof ORGANIZATION_CANON_LEVEL_VALUES)[number];
export type OrganizationConfidence = (typeof ORGANIZATION_CONFIDENCE_VALUES)[number];
export type OrganizationType = (typeof ORGANIZATION_TYPE_VALUES)[number];
export type OrganizationTimestamp = AppTimestamp;

export type Organization = {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  status: OrganizationStatus;
  tags: string[];
  isArchived: boolean;
  canonLevel: OrganizationCanonLevel;
  confidence: OrganizationConfidence;
  organizationType: OrganizationType;
  foundedYear: number | null;
  baseLocationIds: string[];
  leaderTitles: string[];
  memberCountEstimate: number | null;
  goals: string[];
  resources: string[];
  alliances: string[];
  rivals: string[];
  publicWikiSummary: string;
  createdAt: OrganizationTimestamp;
  updatedAt: OrganizationTimestamp;
};

export type OrganizationFormValues = {
  name: string;
  summary: string;
  description: string;
  status: OrganizationStatus;
  organizationType: OrganizationType;
  foundedYear: string;
  baseLocationIds: string;
  leaderTitles: string;
  memberCountEstimate: string;
  goals: string;
  resources: string;
  alliances: string;
  publicWikiSummary: string;
};

export type NormalizedOrganizationFormValues = {
  name: string;
  summary: string;
  description: string;
  status: OrganizationStatus;
  organizationType: OrganizationType;
  foundedYear: number | null;
  baseLocationIds: string[];
  leaderTitles: string[];
  memberCountEstimate: number | null;
  goals: string[];
  resources: string[];
  alliances: string[];
  publicWikiSummary: string;
};

type BuildOrganizationDocumentInput = {
  id: string;
  projectId: string;
  values: NormalizedOrganizationFormValues;
};

export type OrganizationDocumentData = Omit<Organization, "createdAt" | "updatedAt">;

export const ORGANIZATION_STATUS_OPTIONS: ReadonlyArray<{
  value: OrganizationStatus;
  label: string;
}> = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

export const ORGANIZATION_TYPE_OPTIONS: ReadonlyArray<{
  value: OrganizationType;
  label: string;
}> = [
  { value: "scholarly_archive", label: "Scholarly archive" },
  { value: "civic_institution", label: "Civic institution" },
  { value: "guild", label: "Guild" },
  { value: "religious_order", label: "Religious order" },
  { value: "merchant_company", label: "Merchant company" },
  { value: "military_order", label: "Military order" },
  { value: "secret_society", label: "Secret society" },
  { value: "academic_institution", label: "Academic institution" },
  { value: "other", label: "Other" },
];

const DEFAULT_ORGANIZATION_STATUS: OrganizationStatus = "active";
const DEFAULT_ORGANIZATION_CANON_LEVEL: OrganizationCanonLevel = "working";
const DEFAULT_ORGANIZATION_CONFIDENCE: OrganizationConfidence = "medium";
const DEFAULT_ORGANIZATION_TYPE: OrganizationType = "other";

export function createEmptyOrganizationFormValues(): OrganizationFormValues {
  return {
    name: "",
    summary: "",
    description: "",
    status: DEFAULT_ORGANIZATION_STATUS,
    organizationType: DEFAULT_ORGANIZATION_TYPE,
    foundedYear: "",
    baseLocationIds: "",
    leaderTitles: "",
    memberCountEstimate: "",
    goals: "",
    resources: "",
    alliances: "",
    publicWikiSummary: "",
  };
}

export function organizationToFormValues(
  organization: Organization
): OrganizationFormValues {
  return {
    name: organization.name,
    summary: organization.summary,
    description: organization.description,
    status: organization.status,
    organizationType: organization.organizationType,
    foundedYear:
      typeof organization.foundedYear === "number"
        ? String(organization.foundedYear)
        : "",
    baseLocationIds: organization.baseLocationIds.join(", "),
    leaderTitles: organization.leaderTitles.join(", "),
    memberCountEstimate:
      typeof organization.memberCountEstimate === "number"
        ? String(organization.memberCountEstimate)
        : "",
    goals: organization.goals.join(", "),
    resources: organization.resources.join(", "),
    alliances: organization.alliances.join(", "),
    publicWikiSummary: organization.publicWikiSummary,
  };
}

export function normalizeOrganizationFormValues(
  values: OrganizationFormValues
): NormalizedOrganizationFormValues {
  return {
    name: values.name.trim(),
    summary: values.summary.trim(),
    description: values.description.trim(),
    status: coerceOrganizationStatus(values.status),
    organizationType: coerceOrganizationType(values.organizationType),
    foundedYear: parseIntegerOrNull(values.foundedYear),
    baseLocationIds: parseCommaSeparatedList(values.baseLocationIds),
    leaderTitles: parseCommaSeparatedList(values.leaderTitles),
    memberCountEstimate: parseIntegerOrNull(values.memberCountEstimate),
    goals: parseCommaSeparatedList(values.goals),
    resources: parseCommaSeparatedList(values.resources),
    alliances: parseCommaSeparatedList(values.alliances),
    publicWikiSummary: values.publicWikiSummary.trim(),
  };
}

export function buildOrganizationDocument({
  id,
  projectId,
  values,
}: BuildOrganizationDocumentInput): OrganizationDocumentData {
  return {
    id,
    projectId,
    name: values.name,
    slug: slugify(values.name),
    summary: values.summary,
    description: values.description,
    status: values.status,
    tags: [],
    isArchived: values.status === "archived",
    canonLevel: DEFAULT_ORGANIZATION_CANON_LEVEL,
    confidence: DEFAULT_ORGANIZATION_CONFIDENCE,
    organizationType: values.organizationType,
    foundedYear: values.foundedYear,
    baseLocationIds: values.baseLocationIds,
    leaderTitles: values.leaderTitles,
    memberCountEstimate: values.memberCountEstimate,
    goals: values.goals,
    resources: values.resources,
    alliances: values.alliances,
    rivals: [],
    publicWikiSummary: values.publicWikiSummary,
  };
}

export function coerceOrganizationStatus(value: unknown): OrganizationStatus {
  return isAllowedValue(ORGANIZATION_STATUS_VALUES, value)
    ? value
    : DEFAULT_ORGANIZATION_STATUS;
}

export function coerceOrganizationCanonLevel(value: unknown): OrganizationCanonLevel {
  return isAllowedValue(ORGANIZATION_CANON_LEVEL_VALUES, value)
    ? value
    : DEFAULT_ORGANIZATION_CANON_LEVEL;
}

export function coerceOrganizationConfidence(value: unknown): OrganizationConfidence {
  if (isAllowedValue(ORGANIZATION_CONFIDENCE_VALUES, value)) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    if (value >= 0.95) {
      return "confirmed";
    }

    if (value >= 0.7) {
      return "high";
    }

    if (value >= 0.35) {
      return "medium";
    }

    return "low";
  }

  if (typeof value === "string") {
    const normalized = normalizeEnumCandidate(value);

    if (normalized === "core") {
      return "confirmed";
    }

    if (normalized === "uncertain") {
      return "low";
    }
  }

  return DEFAULT_ORGANIZATION_CONFIDENCE;
}

export function coerceOrganizationType(value: unknown): OrganizationType {
  if (isAllowedValue(ORGANIZATION_TYPE_VALUES, value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = normalizeEnumCandidate(value);

    if (isAllowedValue(ORGANIZATION_TYPE_VALUES, normalized)) {
      return normalized;
    }

    if (normalized === "scholarly_archive" || normalized === "scholarly") {
      return "scholarly_archive";
    }

    if (normalized === "archive" || normalized === "scholarly_archive") {
      return "scholarly_archive";
    }
  }

  return DEFAULT_ORGANIZATION_TYPE;
}

export function slugifyOrganizationName(value: string) {
  return slugify(value);
}

function isAllowedValue<const Values extends readonly string[]>(
  values: Values,
  value: unknown
): value is Values[number] {
  return typeof value === "string" && values.includes(value);
}

function parseCommaSeparatedList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseIntegerOrNull(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeEnumCandidate(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "organization"
  );
}
