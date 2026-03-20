import type { Timestamp } from "firebase/firestore";

export const RELIGION_STATUS_VALUES = ["draft", "active", "archived"] as const;
export const RELIGION_CANON_LEVEL_VALUES = [
  "core",
  "working",
  "draft",
  "non_canon",
] as const;
export const RELIGION_CONFIDENCE_VALUES = [
  "low",
  "medium",
  "high",
  "confirmed",
] as const;

export type ReligionStatus = (typeof RELIGION_STATUS_VALUES)[number];
export type ReligionCanonLevel = (typeof RELIGION_CANON_LEVEL_VALUES)[number];
export type ReligionConfidence = (typeof RELIGION_CONFIDENCE_VALUES)[number];
export type ReligionTimestamp = Timestamp | null;

export type Religion = {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  status: ReligionStatus;
  tags: string[];
  isArchived: boolean;
  canonLevel: ReligionCanonLevel;
  confidence: ReligionConfidence;
  deityOrFocus: string;
  beliefSystemType: string;
  coreBeliefs: string[];
  rituals: string[];
  holySites: string[];
  associatedCultures: string[];
  associatedOrganizations: string[];
  publicWikiSummary: string;
  createdAt: ReligionTimestamp;
  updatedAt: ReligionTimestamp;
};

export type ReligionFormValues = {
  name: string;
  summary: string;
  description: string;
  status: ReligionStatus;
  deityOrFocus: string;
  beliefSystemType: string;
  coreBeliefs: string;
  rituals: string;
  holySites: string;
  associatedCultures: string;
  associatedOrganizations: string;
  publicWikiSummary: string;
};

export type NormalizedReligionFormValues = {
  name: string;
  summary: string;
  description: string;
  status: ReligionStatus;
  deityOrFocus: string;
  beliefSystemType: string;
  coreBeliefs: string[];
  rituals: string[];
  holySites: string[];
  associatedCultures: string[];
  associatedOrganizations: string[];
  publicWikiSummary: string;
};

type BuildReligionDocumentInput = {
  id: string;
  projectId: string;
  values: NormalizedReligionFormValues;
};

export type ReligionDocumentData = Omit<Religion, "createdAt" | "updatedAt">;

export const RELIGION_STATUS_OPTIONS: ReadonlyArray<{
  value: ReligionStatus;
  label: string;
}> = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

const DEFAULT_RELIGION_STATUS: ReligionStatus = "active";
const DEFAULT_RELIGION_CANON_LEVEL: ReligionCanonLevel = "working";
const DEFAULT_RELIGION_CONFIDENCE: ReligionConfidence = "medium";

export function createEmptyReligionFormValues(): ReligionFormValues {
  return {
    name: "",
    summary: "",
    description: "",
    status: DEFAULT_RELIGION_STATUS,
    deityOrFocus: "",
    beliefSystemType: "",
    coreBeliefs: "",
    rituals: "",
    holySites: "",
    associatedCultures: "",
    associatedOrganizations: "",
    publicWikiSummary: "",
  };
}

export function religionToFormValues(religion: Religion): ReligionFormValues {
  return {
    name: religion.name,
    summary: religion.summary,
    description: religion.description,
    status: religion.status,
    deityOrFocus: religion.deityOrFocus,
    beliefSystemType: religion.beliefSystemType,
    coreBeliefs: religion.coreBeliefs.join(", "),
    rituals: religion.rituals.join(", "),
    holySites: religion.holySites.join(", "),
    associatedCultures: religion.associatedCultures.join(", "),
    associatedOrganizations: religion.associatedOrganizations.join(", "),
    publicWikiSummary: religion.publicWikiSummary,
  };
}

export function normalizeReligionFormValues(
  values: ReligionFormValues
): NormalizedReligionFormValues {
  return {
    name: values.name.trim(),
    summary: values.summary.trim(),
    description: values.description.trim(),
    status: coerceReligionStatus(values.status),
    deityOrFocus: values.deityOrFocus.trim(),
    beliefSystemType: values.beliefSystemType.trim(),
    coreBeliefs: parseCommaSeparatedList(values.coreBeliefs),
    rituals: parseCommaSeparatedList(values.rituals),
    holySites: parseCommaSeparatedList(values.holySites),
    associatedCultures: parseCommaSeparatedList(values.associatedCultures),
    associatedOrganizations: parseCommaSeparatedList(values.associatedOrganizations),
    publicWikiSummary: values.publicWikiSummary.trim(),
  };
}

export function buildReligionDocument({
  id,
  projectId,
  values,
}: BuildReligionDocumentInput): ReligionDocumentData {
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
    canonLevel: DEFAULT_RELIGION_CANON_LEVEL,
    confidence: DEFAULT_RELIGION_CONFIDENCE,
    deityOrFocus: values.deityOrFocus,
    beliefSystemType: values.beliefSystemType,
    coreBeliefs: values.coreBeliefs,
    rituals: values.rituals,
    holySites: values.holySites,
    associatedCultures: values.associatedCultures,
    associatedOrganizations: values.associatedOrganizations,
    publicWikiSummary: values.publicWikiSummary,
  };
}

export function coerceReligionStatus(value: unknown): ReligionStatus {
  return isAllowedValue(RELIGION_STATUS_VALUES, value) ? value : DEFAULT_RELIGION_STATUS;
}

export function coerceReligionCanonLevel(value: unknown): ReligionCanonLevel {
  return isAllowedValue(RELIGION_CANON_LEVEL_VALUES, value)
    ? value
    : DEFAULT_RELIGION_CANON_LEVEL;
}

export function coerceReligionConfidence(value: unknown): ReligionConfidence {
  if (isAllowedValue(RELIGION_CONFIDENCE_VALUES, value)) {
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

  return DEFAULT_RELIGION_CONFIDENCE;
}

export function slugifyReligionName(value: string) {
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
      .replace(/^-+|-+$/g, "") || "religion"
  );
}
