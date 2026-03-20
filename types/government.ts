import type { Timestamp } from "firebase/firestore";

export const GOVERNMENT_STATUS_VALUES = ["draft", "active", "archived"] as const;
export const GOVERNMENT_CANON_LEVEL_VALUES = [
  "core",
  "working",
  "draft",
  "non_canon",
] as const;
export const GOVERNMENT_CONFIDENCE_VALUES = [
  "low",
  "medium",
  "high",
  "confirmed",
] as const;
export const GOVERNMENT_TYPE_VALUES = [
  "civic_council",
  "monarchy",
  "republic",
  "theocracy",
  "empire",
  "federation",
  "tribal_council",
  "city_state",
  "other",
] as const;

export type GovernmentStatus = (typeof GOVERNMENT_STATUS_VALUES)[number];
export type GovernmentCanonLevel = (typeof GOVERNMENT_CANON_LEVEL_VALUES)[number];
export type GovernmentConfidence = (typeof GOVERNMENT_CONFIDENCE_VALUES)[number];
export type GovernmentType = (typeof GOVERNMENT_TYPE_VALUES)[number];
export type GovernmentTimestamp = Timestamp | null;

export type Government = {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  status: GovernmentStatus;
  tags: string[];
  isArchived: boolean;
  canonLevel: GovernmentCanonLevel;
  confidence: GovernmentConfidence;
  governmentType: GovernmentType;
  seatLocationId: string | null;
  leaderTitles: string[];
  jurisdictionNotes: string;
  factionIds: string[];
  organizationIds: string[];
  lawPriorities: string[];
  publicWikiSummary: string;
  createdAt: GovernmentTimestamp;
  updatedAt: GovernmentTimestamp;
};

export type GovernmentFormValues = {
  name: string;
  summary: string;
  description: string;
  status: GovernmentStatus;
  governmentType: GovernmentType;
  seatLocationId: string;
  leaderTitles: string;
  jurisdictionNotes: string;
  factionIds: string;
  organizationIds: string;
  lawPriorities: string;
  publicWikiSummary: string;
};

export type NormalizedGovernmentFormValues = {
  name: string;
  summary: string;
  description: string;
  status: GovernmentStatus;
  governmentType: GovernmentType;
  seatLocationId: string | null;
  leaderTitles: string[];
  jurisdictionNotes: string;
  factionIds: string[];
  organizationIds: string[];
  lawPriorities: string[];
  publicWikiSummary: string;
};

type BuildGovernmentDocumentInput = {
  id: string;
  projectId: string;
  values: NormalizedGovernmentFormValues;
};

export type GovernmentDocumentData = Omit<Government, "createdAt" | "updatedAt">;

export const GOVERNMENT_STATUS_OPTIONS: ReadonlyArray<{
  value: GovernmentStatus;
  label: string;
}> = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

export const GOVERNMENT_TYPE_OPTIONS: ReadonlyArray<{
  value: GovernmentType;
  label: string;
}> = [
  { value: "civic_council", label: "Civic council" },
  { value: "monarchy", label: "Monarchy" },
  { value: "republic", label: "Republic" },
  { value: "theocracy", label: "Theocracy" },
  { value: "empire", label: "Empire" },
  { value: "federation", label: "Federation" },
  { value: "tribal_council", label: "Tribal council" },
  { value: "city_state", label: "City state" },
  { value: "other", label: "Other" },
];

const DEFAULT_GOVERNMENT_STATUS: GovernmentStatus = "active";
const DEFAULT_GOVERNMENT_CANON_LEVEL: GovernmentCanonLevel = "working";
const DEFAULT_GOVERNMENT_CONFIDENCE: GovernmentConfidence = "medium";
const DEFAULT_GOVERNMENT_TYPE: GovernmentType = "other";

export function createEmptyGovernmentFormValues(): GovernmentFormValues {
  return {
    name: "",
    summary: "",
    description: "",
    status: DEFAULT_GOVERNMENT_STATUS,
    governmentType: DEFAULT_GOVERNMENT_TYPE,
    seatLocationId: "",
    leaderTitles: "",
    jurisdictionNotes: "",
    factionIds: "",
    organizationIds: "",
    lawPriorities: "",
    publicWikiSummary: "",
  };
}

export function governmentToFormValues(government: Government): GovernmentFormValues {
  return {
    name: government.name,
    summary: government.summary,
    description: government.description,
    status: government.status,
    governmentType: government.governmentType,
    seatLocationId: government.seatLocationId ?? "",
    leaderTitles: government.leaderTitles.join(", "),
    jurisdictionNotes: government.jurisdictionNotes,
    factionIds: government.factionIds.join(", "),
    organizationIds: government.organizationIds.join(", "),
    lawPriorities: government.lawPriorities.join(", "),
    publicWikiSummary: government.publicWikiSummary,
  };
}

export function normalizeGovernmentFormValues(
  values: GovernmentFormValues
): NormalizedGovernmentFormValues {
  return {
    name: values.name.trim(),
    summary: values.summary.trim(),
    description: values.description.trim(),
    status: coerceGovernmentStatus(values.status),
    governmentType: coerceGovernmentType(values.governmentType),
    seatLocationId: values.seatLocationId.trim() || null,
    leaderTitles: parseCommaSeparatedList(values.leaderTitles),
    jurisdictionNotes: values.jurisdictionNotes.trim(),
    factionIds: parseCommaSeparatedList(values.factionIds),
    organizationIds: parseCommaSeparatedList(values.organizationIds),
    lawPriorities: parseCommaSeparatedList(values.lawPriorities),
    publicWikiSummary: values.publicWikiSummary.trim(),
  };
}

export function buildGovernmentDocument({
  id,
  projectId,
  values,
}: BuildGovernmentDocumentInput): GovernmentDocumentData {
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
    canonLevel: DEFAULT_GOVERNMENT_CANON_LEVEL,
    confidence: DEFAULT_GOVERNMENT_CONFIDENCE,
    governmentType: values.governmentType,
    seatLocationId: values.seatLocationId,
    leaderTitles: values.leaderTitles,
    jurisdictionNotes: values.jurisdictionNotes,
    factionIds: values.factionIds,
    organizationIds: values.organizationIds,
    lawPriorities: values.lawPriorities,
    publicWikiSummary: values.publicWikiSummary,
  };
}

export function coerceGovernmentStatus(value: unknown): GovernmentStatus {
  return isAllowedValue(GOVERNMENT_STATUS_VALUES, value) ? value : DEFAULT_GOVERNMENT_STATUS;
}

export function coerceGovernmentCanonLevel(value: unknown): GovernmentCanonLevel {
  return isAllowedValue(GOVERNMENT_CANON_LEVEL_VALUES, value)
    ? value
    : DEFAULT_GOVERNMENT_CANON_LEVEL;
}

export function coerceGovernmentConfidence(value: unknown): GovernmentConfidence {
  if (isAllowedValue(GOVERNMENT_CONFIDENCE_VALUES, value)) {
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

  return DEFAULT_GOVERNMENT_CONFIDENCE;
}

export function coerceGovernmentType(value: unknown): GovernmentType {
  if (isAllowedValue(GOVERNMENT_TYPE_VALUES, value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = normalizeEnumCandidate(value);

    if (isAllowedValue(GOVERNMENT_TYPE_VALUES, normalized)) {
      return normalized;
    }

    if (normalized === "civic" || normalized === "civic_council") {
      return "civic_council";
    }

    if (normalized === "city-state") {
      return "city_state";
    }
  }

  return DEFAULT_GOVERNMENT_TYPE;
}

export function slugifyGovernmentName(value: string) {
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

function normalizeEnumCandidate(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "government"
  );
}
