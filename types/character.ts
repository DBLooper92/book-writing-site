import type { Timestamp } from "firebase/firestore";

export const CHARACTER_STATUS_VALUES = ["draft", "active", "archived"] as const;
export const CHARACTER_TYPE_VALUES = [
  "protagonist",
  "antagonist",
  "supporting",
  "minor",
  "background",
] as const;
export const CHARACTER_IMPORTANCE_LEVEL_VALUES = [
  "primary",
  "secondary",
  "tertiary",
  "minor",
] as const;
export const CHARACTER_CANON_LEVEL_VALUES = [
  "core",
  "working",
  "draft",
  "non_canon",
] as const;
export const CHARACTER_CONFIDENCE_VALUES = [
  "low",
  "medium",
  "high",
  "confirmed",
] as const;

export type CharacterStatus = (typeof CHARACTER_STATUS_VALUES)[number];
export type CharacterType = (typeof CHARACTER_TYPE_VALUES)[number];
export type CharacterImportanceLevel =
  (typeof CHARACTER_IMPORTANCE_LEVEL_VALUES)[number];
export type CharacterCanonLevel = (typeof CHARACTER_CANON_LEVEL_VALUES)[number];
export type CharacterConfidence = (typeof CHARACTER_CONFIDENCE_VALUES)[number];
export type CharacterTimestamp = Timestamp | null;

export type Character = {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  status: CharacterStatus;
  tags: string[];
  isArchived: boolean;
  canonLevel: CharacterCanonLevel;
  confidence: CharacterConfidence;
  aliases: string[];
  characterType: CharacterType;
  importanceLevel: CharacterImportanceLevel;
  birthYear: number | null;
  deathYear: number | null;
  apparentAge: string;
  actualAge: string;
  speciesId: string | null;
  cultureIds: string[];
  factionIds: string[];
  religionIds: string[];
  languageIds: string[];
  homeLocationId: string | null;
  currentLocationId: string | null;
  occupation: string[];
  skills: string[];
  traits: string[];
  flaws: string[];
  motivations: string[];
  fears: string[];
  secrets: string[];
  beliefs: string[];
  appearance: string;
  voiceProfile: string;
  arcSummary: string;
  arcStartState: string;
  arcEndState: string;
  keyRelationshipIds: string[];
  timelineEventIds: string[];
  bookIds: string[];
  chapterIds: string[];
  sceneIds: string[];
  importantItems: string[];
  publicWikiSummary: string;
  createdAt: CharacterTimestamp;
  updatedAt: CharacterTimestamp;
};

export type CharacterFormValues = {
  name: string;
  summary: string;
  description: string;
  status: CharacterStatus;
  characterType: CharacterType;
  importanceLevel: CharacterImportanceLevel;
  aliases: string;
  occupation: string;
  traits: string;
  flaws: string;
  motivations: string;
  publicWikiSummary: string;
  birthYear: string;
  homeLocationId: string;
};

export type NormalizedCharacterFormValues = {
  name: string;
  summary: string;
  description: string;
  status: CharacterStatus;
  characterType: CharacterType;
  importanceLevel: CharacterImportanceLevel;
  aliases: string[];
  occupation: string[];
  traits: string[];
  flaws: string[];
  motivations: string[];
  publicWikiSummary: string;
  birthYear: number | null;
  homeLocationId: string | null;
};

type BuildCharacterDocumentInput = {
  id: string;
  projectId: string;
  values: NormalizedCharacterFormValues;
};

export type CharacterDocumentData = Omit<Character, "createdAt" | "updatedAt">;

export const CHARACTER_STATUS_OPTIONS: ReadonlyArray<{
  value: CharacterStatus;
  label: string;
}> = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

export const CHARACTER_TYPE_OPTIONS: ReadonlyArray<{
  value: CharacterType;
  label: string;
}> = [
  { value: "protagonist", label: "Protagonist" },
  { value: "antagonist", label: "Antagonist" },
  { value: "supporting", label: "Supporting" },
  { value: "minor", label: "Minor" },
  { value: "background", label: "Background" },
];

export const CHARACTER_IMPORTANCE_LEVEL_OPTIONS: ReadonlyArray<{
  value: CharacterImportanceLevel;
  label: string;
}> = [
  { value: "primary", label: "Primary" },
  { value: "secondary", label: "Secondary" },
  { value: "tertiary", label: "Tertiary" },
  { value: "minor", label: "Minor" },
];

const DEFAULT_CHARACTER_STATUS: CharacterStatus = "active";
const DEFAULT_CHARACTER_TYPE: CharacterType = "supporting";
const DEFAULT_CHARACTER_IMPORTANCE_LEVEL: CharacterImportanceLevel = "secondary";
const DEFAULT_CHARACTER_CANON_LEVEL: CharacterCanonLevel = "working";
const DEFAULT_CHARACTER_CONFIDENCE: CharacterConfidence = "medium";

export function createEmptyCharacterFormValues(): CharacterFormValues {
  return {
    name: "",
    summary: "",
    description: "",
    status: DEFAULT_CHARACTER_STATUS,
    characterType: DEFAULT_CHARACTER_TYPE,
    importanceLevel: DEFAULT_CHARACTER_IMPORTANCE_LEVEL,
    aliases: "",
    occupation: "",
    traits: "",
    flaws: "",
    motivations: "",
    publicWikiSummary: "",
    birthYear: "",
    homeLocationId: "",
  };
}

export function characterToFormValues(character: Character): CharacterFormValues {
  return {
    name: character.name,
    summary: character.summary,
    description: character.description,
    status: character.status,
    characterType: character.characterType,
    importanceLevel: character.importanceLevel,
    aliases: character.aliases.join(", "),
    occupation: character.occupation.join(", "),
    traits: character.traits.join(", "),
    flaws: character.flaws.join(", "),
    motivations: character.motivations.join(", "),
    publicWikiSummary: character.publicWikiSummary,
    birthYear:
      typeof character.birthYear === "number" ? String(character.birthYear) : "",
    homeLocationId: character.homeLocationId ?? "",
  };
}

export function normalizeCharacterFormValues(
  values: CharacterFormValues
): NormalizedCharacterFormValues {
  return {
    name: values.name.trim(),
    summary: values.summary.trim(),
    description: values.description.trim(),
    status: coerceCharacterStatus(values.status),
    characterType: coerceCharacterType(values.characterType),
    importanceLevel: coerceCharacterImportanceLevel(values.importanceLevel),
    aliases: parseCommaSeparatedList(values.aliases),
    occupation: parseCommaSeparatedList(values.occupation),
    traits: parseCommaSeparatedList(values.traits),
    flaws: parseCommaSeparatedList(values.flaws),
    motivations: parseCommaSeparatedList(values.motivations),
    publicWikiSummary: values.publicWikiSummary.trim(),
    birthYear: parseIntegerOrNull(values.birthYear),
    homeLocationId: values.homeLocationId.trim() || null,
  };
}

export function buildCharacterDocument({
  id,
  projectId,
  values,
}: BuildCharacterDocumentInput): CharacterDocumentData {
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
    canonLevel: DEFAULT_CHARACTER_CANON_LEVEL,
    confidence: DEFAULT_CHARACTER_CONFIDENCE,
    aliases: values.aliases,
    characterType: values.characterType,
    importanceLevel: values.importanceLevel,
    birthYear: values.birthYear,
    deathYear: null,
    apparentAge: "",
    actualAge: "",
    speciesId: null,
    cultureIds: [],
    factionIds: [],
    religionIds: [],
    languageIds: [],
    homeLocationId: values.homeLocationId,
    currentLocationId: values.homeLocationId,
    occupation: values.occupation,
    skills: [],
    traits: values.traits,
    flaws: values.flaws,
    motivations: values.motivations,
    fears: [],
    secrets: [],
    beliefs: [],
    appearance: "",
    voiceProfile: "",
    arcSummary: "",
    arcStartState: "",
    arcEndState: "",
    keyRelationshipIds: [],
    timelineEventIds: [],
    bookIds: [],
    chapterIds: [],
    sceneIds: [],
    importantItems: [],
    publicWikiSummary: values.publicWikiSummary,
  };
}

export function coerceCharacterStatus(value: unknown): CharacterStatus {
  return isAllowedValue(CHARACTER_STATUS_VALUES, value)
    ? value
    : DEFAULT_CHARACTER_STATUS;
}

export function coerceCharacterType(value: unknown): CharacterType {
  return isAllowedValue(CHARACTER_TYPE_VALUES, value)
    ? value
    : DEFAULT_CHARACTER_TYPE;
}

export function coerceCharacterImportanceLevel(
  value: unknown
): CharacterImportanceLevel {
  return isAllowedValue(CHARACTER_IMPORTANCE_LEVEL_VALUES, value)
    ? value
    : DEFAULT_CHARACTER_IMPORTANCE_LEVEL;
}

export function coerceCharacterCanonLevel(value: unknown): CharacterCanonLevel {
  return isAllowedValue(CHARACTER_CANON_LEVEL_VALUES, value)
    ? value
    : DEFAULT_CHARACTER_CANON_LEVEL;
}

export function coerceCharacterConfidence(value: unknown): CharacterConfidence {
  if (isAllowedValue(CHARACTER_CONFIDENCE_VALUES, value)) {
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

  return DEFAULT_CHARACTER_CONFIDENCE;
}

export function slugifyCharacterName(value: string) {
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

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "character"
  );
}
