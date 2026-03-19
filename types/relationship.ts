import type { Timestamp } from "firebase/firestore";

export const RELATIONSHIP_STATUS_VALUES = ["draft", "active", "archived"] as const;
export const RELATIONSHIP_CANON_LEVEL_VALUES = [
  "core",
  "working",
  "draft",
  "non_canon",
] as const;
export const RELATIONSHIP_CONFIDENCE_VALUES = [
  "low",
  "medium",
  "high",
  "confirmed",
] as const;
export const RELATIONSHIP_TYPE_VALUES = [
  "interpersonal",
  "familial",
  "romantic",
  "antagonistic",
  "alliance",
  "mentorship",
  "institutional",
  "political",
  "professional",
  "other",
] as const;
export const RELATIONSHIP_ENTITY_TYPE_VALUES = [
  "books",
  "chapters",
  "scenes",
  "characters",
  "factions",
  "cultures",
  "species",
  "items",
  "locations",
  "timeline_events",
  "notes",
] as const;

export type RelationshipStatus = (typeof RELATIONSHIP_STATUS_VALUES)[number];
export type RelationshipCanonLevel = (typeof RELATIONSHIP_CANON_LEVEL_VALUES)[number];
export type RelationshipConfidence = (typeof RELATIONSHIP_CONFIDENCE_VALUES)[number];
export type RelationshipType = (typeof RELATIONSHIP_TYPE_VALUES)[number];
export type RelationshipEntityType = (typeof RELATIONSHIP_ENTITY_TYPE_VALUES)[number];
export type RelationshipTimestamp = Timestamp | null;

export type Relationship = {
  id: string;
  projectId: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  status: RelationshipStatus;
  tags: string[];
  isArchived: boolean;
  canonLevel: RelationshipCanonLevel;
  confidence: RelationshipConfidence;
  relationshipType: RelationshipType;
  entityAType: RelationshipEntityType;
  entityAId: string;
  entityBType: RelationshipEntityType;
  entityBId: string;
  dynamicStatus: string;
  history: string;
  tensions: string[];
  strengths: string[];
  publicWikiSummary: string;
  createdAt: RelationshipTimestamp;
  updatedAt: RelationshipTimestamp;
};

export type RelationshipFormValues = {
  title: string;
  summary: string;
  description: string;
  status: RelationshipStatus;
  relationshipType: RelationshipType;
  entityAType: RelationshipEntityType;
  entityAId: string;
  entityBType: RelationshipEntityType;
  entityBId: string;
  dynamicStatus: string;
  history: string;
  tensions: string;
  strengths: string;
  publicWikiSummary: string;
};

export type NormalizedRelationshipFormValues = {
  title: string;
  summary: string;
  description: string;
  status: RelationshipStatus;
  relationshipType: RelationshipType;
  entityAType: RelationshipEntityType;
  entityAId: string;
  entityBType: RelationshipEntityType;
  entityBId: string;
  dynamicStatus: string;
  history: string;
  tensions: string[];
  strengths: string[];
  publicWikiSummary: string;
};

type BuildRelationshipDocumentInput = {
  id: string;
  projectId: string;
  values: NormalizedRelationshipFormValues;
};

export type RelationshipDocumentData = Omit<Relationship, "createdAt" | "updatedAt">;

export const RELATIONSHIP_STATUS_OPTIONS: ReadonlyArray<{
  value: RelationshipStatus;
  label: string;
}> = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

export const RELATIONSHIP_TYPE_OPTIONS: ReadonlyArray<{
  value: RelationshipType;
  label: string;
}> = [
  { value: "interpersonal", label: "Interpersonal" },
  { value: "familial", label: "Familial" },
  { value: "romantic", label: "Romantic" },
  { value: "antagonistic", label: "Antagonistic" },
  { value: "alliance", label: "Alliance" },
  { value: "mentorship", label: "Mentorship" },
  { value: "institutional", label: "Institutional" },
  { value: "political", label: "Political" },
  { value: "professional", label: "Professional" },
  { value: "other", label: "Other" },
];

export const RELATIONSHIP_ENTITY_TYPE_OPTIONS: ReadonlyArray<{
  value: RelationshipEntityType;
  label: string;
}> = [
  { value: "characters", label: "Characters" },
  { value: "factions", label: "Factions" },
  { value: "locations", label: "Locations" },
  { value: "cultures", label: "Cultures" },
  { value: "species", label: "Species" },
  { value: "items", label: "Items" },
  { value: "books", label: "Books" },
  { value: "chapters", label: "Chapters" },
  { value: "scenes", label: "Scenes" },
  { value: "timeline_events", label: "Timeline events" },
  { value: "notes", label: "Notes" },
];

const DEFAULT_RELATIONSHIP_STATUS: RelationshipStatus = "active";
const DEFAULT_RELATIONSHIP_CANON_LEVEL: RelationshipCanonLevel = "working";
const DEFAULT_RELATIONSHIP_CONFIDENCE: RelationshipConfidence = "medium";
const DEFAULT_RELATIONSHIP_TYPE: RelationshipType = "interpersonal";
const DEFAULT_RELATIONSHIP_ENTITY_TYPE: RelationshipEntityType = "characters";

export function createEmptyRelationshipFormValues(): RelationshipFormValues {
  return {
    title: "",
    summary: "",
    description: "",
    status: DEFAULT_RELATIONSHIP_STATUS,
    relationshipType: DEFAULT_RELATIONSHIP_TYPE,
    entityAType: DEFAULT_RELATIONSHIP_ENTITY_TYPE,
    entityAId: "",
    entityBType: DEFAULT_RELATIONSHIP_ENTITY_TYPE,
    entityBId: "",
    dynamicStatus: "",
    history: "",
    tensions: "",
    strengths: "",
    publicWikiSummary: "",
  };
}

export function relationshipToFormValues(
  relationship: Relationship
): RelationshipFormValues {
  return {
    title: relationship.title,
    summary: relationship.summary,
    description: relationship.description,
    status: relationship.status,
    relationshipType: relationship.relationshipType,
    entityAType: relationship.entityAType,
    entityAId: relationship.entityAId,
    entityBType: relationship.entityBType,
    entityBId: relationship.entityBId,
    dynamicStatus: relationship.dynamicStatus,
    history: relationship.history,
    tensions: relationship.tensions.join(", "),
    strengths: relationship.strengths.join(", "),
    publicWikiSummary: relationship.publicWikiSummary,
  };
}

export function normalizeRelationshipFormValues(
  values: RelationshipFormValues
): NormalizedRelationshipFormValues {
  return {
    title: values.title.trim(),
    summary: values.summary.trim(),
    description: values.description.trim(),
    status: coerceRelationshipStatus(values.status),
    relationshipType: coerceRelationshipType(values.relationshipType),
    entityAType: coerceRelationshipEntityType(values.entityAType),
    entityAId: values.entityAId.trim(),
    entityBType: coerceRelationshipEntityType(values.entityBType),
    entityBId: values.entityBId.trim(),
    dynamicStatus: values.dynamicStatus.trim(),
    history: values.history.trim(),
    tensions: parseCommaSeparatedList(values.tensions),
    strengths: parseCommaSeparatedList(values.strengths),
    publicWikiSummary: values.publicWikiSummary.trim(),
  };
}

export function buildRelationshipDocument({
  id,
  projectId,
  values,
}: BuildRelationshipDocumentInput): RelationshipDocumentData {
  return {
    id,
    projectId,
    title: values.title,
    slug: slugify(values.title),
    summary: values.summary,
    description: values.description,
    status: values.status,
    tags: [],
    isArchived: values.status === "archived",
    canonLevel: DEFAULT_RELATIONSHIP_CANON_LEVEL,
    confidence: DEFAULT_RELATIONSHIP_CONFIDENCE,
    relationshipType: values.relationshipType,
    entityAType: values.entityAType,
    entityAId: values.entityAId,
    entityBType: values.entityBType,
    entityBId: values.entityBId,
    dynamicStatus: values.dynamicStatus,
    history: values.history,
    tensions: values.tensions,
    strengths: values.strengths,
    publicWikiSummary: values.publicWikiSummary,
  };
}

export function coerceRelationshipStatus(value: unknown): RelationshipStatus {
  return isAllowedValue(RELATIONSHIP_STATUS_VALUES, value)
    ? value
    : DEFAULT_RELATIONSHIP_STATUS;
}

export function coerceRelationshipCanonLevel(value: unknown): RelationshipCanonLevel {
  return isAllowedValue(RELATIONSHIP_CANON_LEVEL_VALUES, value)
    ? value
    : DEFAULT_RELATIONSHIP_CANON_LEVEL;
}

export function coerceRelationshipConfidence(value: unknown): RelationshipConfidence {
  if (isAllowedValue(RELATIONSHIP_CONFIDENCE_VALUES, value)) {
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

  return DEFAULT_RELATIONSHIP_CONFIDENCE;
}

export function coerceRelationshipType(value: unknown): RelationshipType {
  if (isAllowedValue(RELATIONSHIP_TYPE_VALUES, value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = normalizeEnumCandidate(value);

    if (isAllowedValue(RELATIONSHIP_TYPE_VALUES, normalized)) {
      return normalized;
    }

    if (normalized === "family") {
      return "familial";
    }

    if (normalized === "enemy" || normalized === "rival") {
      return "antagonistic";
    }

    if (normalized === "mentor") {
      return "mentorship";
    }

    if (normalized === "work") {
      return "professional";
    }
  }

  return DEFAULT_RELATIONSHIP_TYPE;
}

export function coerceRelationshipEntityType(value: unknown): RelationshipEntityType {
  if (isAllowedValue(RELATIONSHIP_ENTITY_TYPE_VALUES, value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = normalizeEnumCandidate(value);

    if (isAllowedValue(RELATIONSHIP_ENTITY_TYPE_VALUES, normalized)) {
      return normalized;
    }

    if (normalized === "character" || normalized === "char") {
      return "characters";
    }

    if (normalized === "faction") {
      return "factions";
    }

    if (normalized === "location") {
      return "locations";
    }

    if (normalized === "culture") {
      return "cultures";
    }

    if (normalized === "item") {
      return "items";
    }

    if (normalized === "book") {
      return "books";
    }

    if (normalized === "chapter") {
      return "chapters";
    }

    if (normalized === "scene") {
      return "scenes";
    }

    if (
      normalized === "timeline_event" ||
      normalized === "timeline_events" ||
      normalized === "event"
    ) {
      return "timeline_events";
    }

    if (normalized === "note") {
      return "notes";
    }
  }

  return DEFAULT_RELATIONSHIP_ENTITY_TYPE;
}

export function slugifyRelationshipTitle(value: string) {
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
      .replace(/^-+|-+$/g, "") || "relationship"
  );
}
