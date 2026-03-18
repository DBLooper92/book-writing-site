import type { Timestamp } from "firebase/firestore";

export const FACTION_STATUS_VALUES = ["draft", "active", "archived"] as const;
export const FACTION_CANON_LEVEL_VALUES = [
  "core",
  "working",
  "draft",
  "non_canon",
] as const;
export const FACTION_CONFIDENCE_VALUES = [
  "low",
  "medium",
  "high",
  "confirmed",
] as const;
export const FACTION_TYPE_VALUES = [
  "civic_order",
  "military_order",
  "noble_house",
  "guild",
  "religious_order",
  "scholarly_order",
  "merchant_company",
  "political_movement",
  "criminal_network",
  "secret_society",
  "other",
] as const;

export type FactionStatus = (typeof FACTION_STATUS_VALUES)[number];
export type FactionCanonLevel = (typeof FACTION_CANON_LEVEL_VALUES)[number];
export type FactionConfidence = (typeof FACTION_CONFIDENCE_VALUES)[number];
export type FactionType = (typeof FACTION_TYPE_VALUES)[number];
export type FactionTimestamp = Timestamp | null;

export type Faction = {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  status: FactionStatus;
  tags: string[];
  isArchived: boolean;
  canonLevel: FactionCanonLevel;
  confidence: FactionConfidence;
  factionType: FactionType;
  foundedYear: number | null;
  endedYear: number | null;
  leaderCharacterIds: string[];
  baseLocationIds: string[];
  cultureIds: string[];
  religionIds: string[];
  governmentId: string | null;
  goals: string[];
  resources: string[];
  rivals: string[];
  allies: string[];
  timelineEventIds: string[];
  bookIds: string[];
  publicWikiSummary: string;
  createdAt: FactionTimestamp;
  updatedAt: FactionTimestamp;
};

export type FactionFormValues = {
  name: string;
  summary: string;
  description: string;
  status: FactionStatus;
  factionType: FactionType;
  foundedYear: string;
  endedYear: string;
  leaderCharacterIds: string;
  baseLocationIds: string;
  governmentId: string;
  goals: string;
  resources: string;
  publicWikiSummary: string;
};

export type NormalizedFactionFormValues = {
  name: string;
  summary: string;
  description: string;
  status: FactionStatus;
  factionType: FactionType;
  foundedYear: number | null;
  endedYear: number | null;
  leaderCharacterIds: string[];
  baseLocationIds: string[];
  governmentId: string | null;
  goals: string[];
  resources: string[];
  publicWikiSummary: string;
};

type BuildFactionDocumentInput = {
  id: string;
  projectId: string;
  values: NormalizedFactionFormValues;
};

export type FactionDocumentData = Omit<Faction, "createdAt" | "updatedAt">;

export const FACTION_STATUS_OPTIONS: ReadonlyArray<{
  value: FactionStatus;
  label: string;
}> = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

export const FACTION_TYPE_OPTIONS: ReadonlyArray<{
  value: FactionType;
  label: string;
}> = [
  { value: "civic_order", label: "Civic order" },
  { value: "military_order", label: "Military order" },
  { value: "noble_house", label: "Noble house" },
  { value: "guild", label: "Guild" },
  { value: "religious_order", label: "Religious order" },
  { value: "scholarly_order", label: "Scholarly order" },
  { value: "merchant_company", label: "Merchant company" },
  { value: "political_movement", label: "Political movement" },
  { value: "criminal_network", label: "Criminal network" },
  { value: "secret_society", label: "Secret society" },
  { value: "other", label: "Other" },
];

const DEFAULT_FACTION_STATUS: FactionStatus = "active";
const DEFAULT_FACTION_CANON_LEVEL: FactionCanonLevel = "working";
const DEFAULT_FACTION_CONFIDENCE: FactionConfidence = "medium";
const DEFAULT_FACTION_TYPE: FactionType = "other";

export function createEmptyFactionFormValues(): FactionFormValues {
  return {
    name: "",
    summary: "",
    description: "",
    status: DEFAULT_FACTION_STATUS,
    factionType: DEFAULT_FACTION_TYPE,
    foundedYear: "",
    endedYear: "",
    leaderCharacterIds: "",
    baseLocationIds: "",
    governmentId: "",
    goals: "",
    resources: "",
    publicWikiSummary: "",
  };
}

export function factionToFormValues(faction: Faction): FactionFormValues {
  return {
    name: faction.name,
    summary: faction.summary,
    description: faction.description,
    status: faction.status,
    factionType: faction.factionType,
    foundedYear:
      typeof faction.foundedYear === "number" ? String(faction.foundedYear) : "",
    endedYear: typeof faction.endedYear === "number" ? String(faction.endedYear) : "",
    leaderCharacterIds: faction.leaderCharacterIds.join(", "),
    baseLocationIds: faction.baseLocationIds.join(", "),
    governmentId: faction.governmentId ?? "",
    goals: faction.goals.join(", "),
    resources: faction.resources.join(", "),
    publicWikiSummary: faction.publicWikiSummary,
  };
}

export function normalizeFactionFormValues(
  values: FactionFormValues
): NormalizedFactionFormValues {
  return {
    name: values.name.trim(),
    summary: values.summary.trim(),
    description: values.description.trim(),
    status: coerceFactionStatus(values.status),
    factionType: coerceFactionType(values.factionType),
    foundedYear: parseIntegerOrNull(values.foundedYear),
    endedYear: parseIntegerOrNull(values.endedYear),
    leaderCharacterIds: parseCommaSeparatedList(values.leaderCharacterIds),
    baseLocationIds: parseCommaSeparatedList(values.baseLocationIds),
    governmentId: values.governmentId.trim() || null,
    goals: parseCommaSeparatedList(values.goals),
    resources: parseCommaSeparatedList(values.resources),
    publicWikiSummary: values.publicWikiSummary.trim(),
  };
}

export function buildFactionDocument({
  id,
  projectId,
  values,
}: BuildFactionDocumentInput): FactionDocumentData {
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
    canonLevel: DEFAULT_FACTION_CANON_LEVEL,
    confidence: DEFAULT_FACTION_CONFIDENCE,
    factionType: values.factionType,
    foundedYear: values.foundedYear,
    endedYear: values.endedYear,
    leaderCharacterIds: values.leaderCharacterIds,
    baseLocationIds: values.baseLocationIds,
    cultureIds: [],
    religionIds: [],
    governmentId: values.governmentId,
    goals: values.goals,
    resources: values.resources,
    rivals: [],
    allies: [],
    timelineEventIds: [],
    bookIds: [],
    publicWikiSummary: values.publicWikiSummary,
  };
}

export function coerceFactionStatus(value: unknown): FactionStatus {
  return isAllowedValue(FACTION_STATUS_VALUES, value) ? value : DEFAULT_FACTION_STATUS;
}

export function coerceFactionCanonLevel(value: unknown): FactionCanonLevel {
  return isAllowedValue(FACTION_CANON_LEVEL_VALUES, value)
    ? value
    : DEFAULT_FACTION_CANON_LEVEL;
}

export function coerceFactionConfidence(value: unknown): FactionConfidence {
  if (isAllowedValue(FACTION_CONFIDENCE_VALUES, value)) {
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

  return DEFAULT_FACTION_CONFIDENCE;
}

export function coerceFactionType(value: unknown): FactionType {
  if (isAllowedValue(FACTION_TYPE_VALUES, value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = normalizeEnumCandidate(value);

    if (isAllowedValue(FACTION_TYPE_VALUES, normalized)) {
      return normalized;
    }

    if (normalized === "civic" || normalized === "city_guard") {
      return "civic_order";
    }

    if (normalized === "military" || normalized === "army") {
      return "military_order";
    }

    if (normalized === "merchant" || normalized === "trade_company") {
      return "merchant_company";
    }
  }

  return DEFAULT_FACTION_TYPE;
}

export function slugifyFactionName(value: string) {
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
      .replace(/^-+|-+$/g, "") || "faction"
  );
}
