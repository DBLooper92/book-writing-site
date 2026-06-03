import type { AppTimestamp } from "@/types/timestamp";

export const SPECIES_STATUS_VALUES = ["draft", "active", "archived"] as const;
export const SPECIES_CANON_LEVEL_VALUES = [
  "core",
  "working",
  "draft",
  "non_canon",
] as const;
export const SPECIES_CONFIDENCE_VALUES = [
  "low",
  "medium",
  "high",
  "confirmed",
] as const;

export type SpeciesStatus = (typeof SPECIES_STATUS_VALUES)[number];
export type SpeciesCanonLevel = (typeof SPECIES_CANON_LEVEL_VALUES)[number];
export type SpeciesConfidence = (typeof SPECIES_CONFIDENCE_VALUES)[number];
export type SpeciesTimestamp = AppTimestamp;

export type Species = {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  status: SpeciesStatus;
  tags: string[];
  isArchived: boolean;
  canonLevel: SpeciesCanonLevel;
  confidence: SpeciesConfidence;
  origin: string;
  lifespan: string;
  appearance: string;
  biology: string;
  reproduction: string;
  diet: string;
  psychology: string;
  socialStructure: string;
  abilities: string[];
  limitations: string[];
  notableSubgroups: string[];
  publicWikiSummary: string;
  createdAt: SpeciesTimestamp;
  updatedAt: SpeciesTimestamp;
};

export type SpeciesFormValues = {
  name: string;
  summary: string;
  description: string;
  status: SpeciesStatus;
  origin: string;
  lifespan: string;
  appearance: string;
  biology: string;
  reproduction: string;
  diet: string;
  psychology: string;
  socialStructure: string;
  abilities: string;
  limitations: string;
  notableSubgroups: string;
  publicWikiSummary: string;
};

export type NormalizedSpeciesFormValues = {
  name: string;
  summary: string;
  description: string;
  status: SpeciesStatus;
  origin: string;
  lifespan: string;
  appearance: string;
  biology: string;
  reproduction: string;
  diet: string;
  psychology: string;
  socialStructure: string;
  abilities: string[];
  limitations: string[];
  notableSubgroups: string[];
  publicWikiSummary: string;
};

type BuildSpeciesDocumentInput = {
  id: string;
  projectId: string;
  values: NormalizedSpeciesFormValues;
};

export type SpeciesDocumentData = Omit<Species, "createdAt" | "updatedAt">;

export const SPECIES_STATUS_OPTIONS: ReadonlyArray<{
  value: SpeciesStatus;
  label: string;
}> = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

const DEFAULT_SPECIES_STATUS: SpeciesStatus = "active";
const DEFAULT_SPECIES_CANON_LEVEL: SpeciesCanonLevel = "working";
const DEFAULT_SPECIES_CONFIDENCE: SpeciesConfidence = "medium";

export function createEmptySpeciesFormValues(): SpeciesFormValues {
  return {
    name: "",
    summary: "",
    description: "",
    status: DEFAULT_SPECIES_STATUS,
    origin: "",
    lifespan: "",
    appearance: "",
    biology: "",
    reproduction: "",
    diet: "",
    psychology: "",
    socialStructure: "",
    abilities: "",
    limitations: "",
    notableSubgroups: "",
    publicWikiSummary: "",
  };
}

export function speciesToFormValues(species: Species): SpeciesFormValues {
  return {
    name: species.name,
    summary: species.summary,
    description: species.description,
    status: species.status,
    origin: species.origin,
    lifespan: species.lifespan,
    appearance: species.appearance,
    biology: species.biology,
    reproduction: species.reproduction,
    diet: species.diet,
    psychology: species.psychology,
    socialStructure: species.socialStructure,
    abilities: species.abilities.join(", "),
    limitations: species.limitations.join(", "),
    notableSubgroups: species.notableSubgroups.join(", "),
    publicWikiSummary: species.publicWikiSummary,
  };
}

export function normalizeSpeciesFormValues(
  values: SpeciesFormValues
): NormalizedSpeciesFormValues {
  return {
    name: values.name.trim(),
    summary: values.summary.trim(),
    description: values.description.trim(),
    status: coerceSpeciesStatus(values.status),
    origin: values.origin.trim(),
    lifespan: values.lifespan.trim(),
    appearance: values.appearance.trim(),
    biology: values.biology.trim(),
    reproduction: values.reproduction.trim(),
    diet: values.diet.trim(),
    psychology: values.psychology.trim(),
    socialStructure: values.socialStructure.trim(),
    abilities: parseCommaSeparatedList(values.abilities),
    limitations: parseCommaSeparatedList(values.limitations),
    notableSubgroups: parseCommaSeparatedList(values.notableSubgroups),
    publicWikiSummary: values.publicWikiSummary.trim(),
  };
}

export function buildSpeciesDocument({
  id,
  projectId,
  values,
}: BuildSpeciesDocumentInput): SpeciesDocumentData {
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
    canonLevel: DEFAULT_SPECIES_CANON_LEVEL,
    confidence: DEFAULT_SPECIES_CONFIDENCE,
    origin: values.origin,
    lifespan: values.lifespan,
    appearance: values.appearance,
    biology: values.biology,
    reproduction: values.reproduction,
    diet: values.diet,
    psychology: values.psychology,
    socialStructure: values.socialStructure,
    abilities: values.abilities,
    limitations: values.limitations,
    notableSubgroups: values.notableSubgroups,
    publicWikiSummary: values.publicWikiSummary,
  };
}

export function coerceSpeciesStatus(value: unknown): SpeciesStatus {
  return isAllowedValue(SPECIES_STATUS_VALUES, value) ? value : DEFAULT_SPECIES_STATUS;
}

export function coerceSpeciesCanonLevel(value: unknown): SpeciesCanonLevel {
  return isAllowedValue(SPECIES_CANON_LEVEL_VALUES, value)
    ? value
    : DEFAULT_SPECIES_CANON_LEVEL;
}

export function coerceSpeciesConfidence(value: unknown): SpeciesConfidence {
  if (isAllowedValue(SPECIES_CONFIDENCE_VALUES, value)) {
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

  return DEFAULT_SPECIES_CONFIDENCE;
}

export function slugifySpeciesName(value: string) {
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
      .replace(/^-+|-+$/g, "") || "species"
  );
}
