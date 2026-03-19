import type { Timestamp } from "firebase/firestore";

export const ITEM_STATUS_VALUES = ["draft", "active", "archived"] as const;
export const ITEM_CANON_LEVEL_VALUES = [
  "core",
  "working",
  "draft",
  "non_canon",
] as const;
export const ITEM_CONFIDENCE_VALUES = [
  "low",
  "medium",
  "high",
  "confirmed",
] as const;

export type ItemStatus = (typeof ITEM_STATUS_VALUES)[number];
export type ItemCanonLevel = (typeof ITEM_CANON_LEVEL_VALUES)[number];
export type ItemConfidence = (typeof ITEM_CONFIDENCE_VALUES)[number];
export type ItemTimestamp = Timestamp | null;

export type Item = {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  status: ItemStatus;
  tags: string[];
  isArchived: boolean;
  canonLevel: ItemCanonLevel;
  confidence: ItemConfidence;
  itemType: string;
  ownerCharacterIds: string[];
  locationIds: string[];
  factionIds: string[];
  createdYear: number | null;
  material: string;
  abilities: string[];
  limitations: string[];
  symbolicMeaning: string;
  timelineEventIds: string[];
  publicWikiSummary: string;
  createdAt: ItemTimestamp;
  updatedAt: ItemTimestamp;
};

export type ItemFormValues = {
  name: string;
  summary: string;
  description: string;
  status: ItemStatus;
  itemType: string;
  ownerCharacterIds: string;
  locationIds: string;
  factionIds: string;
  createdYear: string;
  material: string;
  abilities: string;
  limitations: string;
  symbolicMeaning: string;
  timelineEventIds: string;
  publicWikiSummary: string;
};

export type NormalizedItemFormValues = {
  name: string;
  summary: string;
  description: string;
  status: ItemStatus;
  itemType: string;
  ownerCharacterIds: string[];
  locationIds: string[];
  factionIds: string[];
  createdYear: number | null;
  material: string;
  abilities: string[];
  limitations: string[];
  symbolicMeaning: string;
  timelineEventIds: string[];
  publicWikiSummary: string;
};

type BuildItemDocumentInput = {
  id: string;
  projectId: string;
  values: NormalizedItemFormValues;
};

export type ItemDocumentData = Omit<Item, "createdAt" | "updatedAt">;

export const ITEM_STATUS_OPTIONS: ReadonlyArray<{
  value: ItemStatus;
  label: string;
}> = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

const DEFAULT_ITEM_STATUS: ItemStatus = "active";
const DEFAULT_ITEM_CANON_LEVEL: ItemCanonLevel = "working";
const DEFAULT_ITEM_CONFIDENCE: ItemConfidence = "medium";

export function createEmptyItemFormValues(): ItemFormValues {
  return {
    name: "",
    summary: "",
    description: "",
    status: DEFAULT_ITEM_STATUS,
    itemType: "artifact",
    ownerCharacterIds: "",
    locationIds: "",
    factionIds: "",
    createdYear: "",
    material: "",
    abilities: "",
    limitations: "",
    symbolicMeaning: "",
    timelineEventIds: "",
    publicWikiSummary: "",
  };
}

export function itemToFormValues(item: Item): ItemFormValues {
  return {
    name: item.name,
    summary: item.summary,
    description: item.description,
    status: item.status,
    itemType: item.itemType,
    ownerCharacterIds: item.ownerCharacterIds.join(", "),
    locationIds: item.locationIds.join(", "),
    factionIds: item.factionIds.join(", "),
    createdYear: typeof item.createdYear === "number" ? String(item.createdYear) : "",
    material: item.material,
    abilities: item.abilities.join(", "),
    limitations: item.limitations.join(", "),
    symbolicMeaning: item.symbolicMeaning,
    timelineEventIds: item.timelineEventIds.join(", "),
    publicWikiSummary: item.publicWikiSummary,
  };
}

export function normalizeItemFormValues(values: ItemFormValues): NormalizedItemFormValues {
  return {
    name: values.name.trim(),
    summary: values.summary.trim(),
    description: values.description.trim(),
    status: coerceItemStatus(values.status),
    itemType: values.itemType.trim() || "artifact",
    ownerCharacterIds: parseCommaSeparatedList(values.ownerCharacterIds),
    locationIds: parseCommaSeparatedList(values.locationIds),
    factionIds: parseCommaSeparatedList(values.factionIds),
    createdYear: parseIntegerOrNull(values.createdYear),
    material: values.material.trim(),
    abilities: parseCommaSeparatedList(values.abilities),
    limitations: parseCommaSeparatedList(values.limitations),
    symbolicMeaning: values.symbolicMeaning.trim(),
    timelineEventIds: parseCommaSeparatedList(values.timelineEventIds),
    publicWikiSummary: values.publicWikiSummary.trim(),
  };
}

export function buildItemDocument({
  id,
  projectId,
  values,
}: BuildItemDocumentInput): ItemDocumentData {
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
    canonLevel: DEFAULT_ITEM_CANON_LEVEL,
    confidence: DEFAULT_ITEM_CONFIDENCE,
    itemType: values.itemType,
    ownerCharacterIds: values.ownerCharacterIds,
    locationIds: values.locationIds,
    factionIds: values.factionIds,
    createdYear: values.createdYear,
    material: values.material,
    abilities: values.abilities,
    limitations: values.limitations,
    symbolicMeaning: values.symbolicMeaning,
    timelineEventIds: values.timelineEventIds,
    publicWikiSummary: values.publicWikiSummary,
  };
}

export function coerceItemStatus(value: unknown): ItemStatus {
  return isAllowedValue(ITEM_STATUS_VALUES, value) ? value : DEFAULT_ITEM_STATUS;
}

export function coerceItemCanonLevel(value: unknown): ItemCanonLevel {
  return isAllowedValue(ITEM_CANON_LEVEL_VALUES, value)
    ? value
    : DEFAULT_ITEM_CANON_LEVEL;
}

export function coerceItemConfidence(value: unknown): ItemConfidence {
  if (isAllowedValue(ITEM_CONFIDENCE_VALUES, value)) {
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

  return DEFAULT_ITEM_CONFIDENCE;
}

export function slugifyItemName(value: string) {
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
      .replace(/^-+|-+$/g, "") || "item"
  );
}
