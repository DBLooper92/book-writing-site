import type { AppTimestamp } from "@/types/timestamp";

export const LOCATION_STATUS_VALUES = ["draft", "active", "archived"] as const;
export const LOCATION_CANON_LEVEL_VALUES = [
  "core",
  "working",
  "draft",
  "non_canon",
] as const;
export const LOCATION_CONFIDENCE_VALUES = [
  "low",
  "medium",
  "high",
  "confirmed",
] as const;

export type LocationStatus = (typeof LOCATION_STATUS_VALUES)[number];
export type LocationCanonLevel = (typeof LOCATION_CANON_LEVEL_VALUES)[number];
export type LocationConfidence = (typeof LOCATION_CONFIDENCE_VALUES)[number];
export type LocationTimestamp = AppTimestamp;

export type Location = {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  status: LocationStatus;
  tags: string[];
  isArchived: boolean;
  canonLevel: LocationCanonLevel;
  confidence: LocationConfidence;
  locationType: string;
  parentLocationId: string | null;
  childLocationIds: string[];
  eraIds: string[];
  cultureIds: string[];
  factionIds: string[];
  populationNotes: string;
  climate: string;
  geography: string;
  architecture: string;
  economy: string;
  customs: string[];
  dangerLevel: string;
  notableFeatures: string[];
  timelineEventIds: string[];
  bookIds: string[];
  characterIds: string[];
  publicWikiSummary: string;
  createdAt: LocationTimestamp;
  updatedAt: LocationTimestamp;
};

export type LocationFormValues = {
  name: string;
  summary: string;
  description: string;
  status: LocationStatus;
  locationType: string;
  parentLocationId: string;
  climate: string;
  geography: string;
  architecture: string;
  customs: string;
  dangerLevel: string;
  notableFeatures: string;
  publicWikiSummary: string;
};

export type NormalizedLocationFormValues = {
  name: string;
  summary: string;
  description: string;
  status: LocationStatus;
  locationType: string;
  parentLocationId: string | null;
  climate: string;
  geography: string;
  architecture: string;
  customs: string[];
  dangerLevel: string;
  notableFeatures: string[];
  publicWikiSummary: string;
};

type BuildLocationDocumentInput = {
  id: string;
  projectId: string;
  values: NormalizedLocationFormValues;
};

export type LocationDocumentData = Omit<Location, "createdAt" | "updatedAt">;

export const LOCATION_STATUS_OPTIONS: ReadonlyArray<{
  value: LocationStatus;
  label: string;
}> = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

const DEFAULT_LOCATION_STATUS: LocationStatus = "active";
const DEFAULT_LOCATION_CANON_LEVEL: LocationCanonLevel = "working";
const DEFAULT_LOCATION_CONFIDENCE: LocationConfidence = "medium";

export function createEmptyLocationFormValues(): LocationFormValues {
  return {
    name: "",
    summary: "",
    description: "",
    status: DEFAULT_LOCATION_STATUS,
    locationType: "settlement",
    parentLocationId: "",
    climate: "",
    geography: "",
    architecture: "",
    customs: "",
    dangerLevel: "moderate",
    notableFeatures: "",
    publicWikiSummary: "",
  };
}

export function locationToFormValues(location: Location): LocationFormValues {
  return {
    name: location.name,
    summary: location.summary,
    description: location.description,
    status: location.status,
    locationType: location.locationType,
    parentLocationId: location.parentLocationId ?? "",
    climate: location.climate,
    geography: location.geography,
    architecture: location.architecture,
    customs: location.customs.join(", "),
    dangerLevel: location.dangerLevel,
    notableFeatures: location.notableFeatures.join(", "),
    publicWikiSummary: location.publicWikiSummary,
  };
}

export function normalizeLocationFormValues(
  values: LocationFormValues
): NormalizedLocationFormValues {
  return {
    name: values.name.trim(),
    summary: values.summary.trim(),
    description: values.description.trim(),
    status: coerceLocationStatus(values.status),
    locationType: values.locationType.trim() || "settlement",
    parentLocationId: values.parentLocationId.trim() || null,
    climate: values.climate.trim(),
    geography: values.geography.trim(),
    architecture: values.architecture.trim(),
    customs: parseCommaSeparatedList(values.customs),
    dangerLevel: values.dangerLevel.trim() || "moderate",
    notableFeatures: parseCommaSeparatedList(values.notableFeatures),
    publicWikiSummary: values.publicWikiSummary.trim(),
  };
}

export function buildLocationDocument({
  id,
  projectId,
  values,
}: BuildLocationDocumentInput): LocationDocumentData {
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
    canonLevel: DEFAULT_LOCATION_CANON_LEVEL,
    confidence: DEFAULT_LOCATION_CONFIDENCE,
    locationType: values.locationType,
    parentLocationId: values.parentLocationId,
    childLocationIds: [],
    eraIds: [],
    cultureIds: [],
    factionIds: [],
    populationNotes: "",
    climate: values.climate,
    geography: values.geography,
    architecture: values.architecture,
    economy: "",
    customs: values.customs,
    dangerLevel: values.dangerLevel,
    notableFeatures: values.notableFeatures,
    timelineEventIds: [],
    bookIds: [],
    characterIds: [],
    publicWikiSummary: values.publicWikiSummary,
  };
}

export function coerceLocationStatus(value: unknown): LocationStatus {
  return isAllowedValue(LOCATION_STATUS_VALUES, value) ? value : DEFAULT_LOCATION_STATUS;
}

export function coerceLocationCanonLevel(value: unknown): LocationCanonLevel {
  return isAllowedValue(LOCATION_CANON_LEVEL_VALUES, value)
    ? value
    : DEFAULT_LOCATION_CANON_LEVEL;
}

export function coerceLocationConfidence(value: unknown): LocationConfidence {
  if (isAllowedValue(LOCATION_CONFIDENCE_VALUES, value)) {
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
    const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");

    if (normalized === "core") {
      return "confirmed";
    }

    if (normalized === "uncertain") {
      return "low";
    }
  }

  return DEFAULT_LOCATION_CONFIDENCE;
}

export function slugifyLocationName(value: string) {
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

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "location"
  );
}
