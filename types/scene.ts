import type { Timestamp } from "firebase/firestore";

export const SCENE_STATUS_VALUES = [
  "outline",
  "drafting",
  "revising",
  "complete",
  "archived",
] as const;
export const SCENE_CANON_LEVEL_VALUES = [
  "core",
  "working",
  "draft",
  "non_canon",
] as const;
export const SCENE_CONFIDENCE_VALUES = [
  "low",
  "medium",
  "high",
  "confirmed",
] as const;
export const SCENE_TYPE_VALUES = [
  "opening",
  "setup",
  "conflict",
  "reaction",
  "revelation",
  "transition",
  "climax",
  "aftermath",
  "other",
] as const;

export type SceneStatus = (typeof SCENE_STATUS_VALUES)[number];
export type SceneCanonLevel = (typeof SCENE_CANON_LEVEL_VALUES)[number];
export type SceneConfidence = (typeof SCENE_CONFIDENCE_VALUES)[number];
export type SceneType = (typeof SCENE_TYPE_VALUES)[number];
export type SceneTimestamp = Timestamp | null;

export type Scene = {
  id: string;
  projectId: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  status: SceneStatus;
  tags: string[];
  isArchived: boolean;
  canonLevel: SceneCanonLevel;
  confidence: SceneConfidence;
  bookId: string | null;
  chapterId: string | null;
  sceneNumber: number | null;
  sceneType: SceneType;
  pointOfViewCharacterId: string | null;
  goal: string;
  conflict: string;
  outcome: string;
  textDraft: string;
  timelineEventIds: string[];
  characterIds: string[];
  locationIds: string[];
  plotThreadIds: string[];
  createdAt: SceneTimestamp;
  updatedAt: SceneTimestamp;
};

export type SceneFormValues = {
  title: string;
  summary: string;
  description: string;
  status: SceneStatus;
  bookId: string;
  chapterId: string;
  sceneNumber: string;
  sceneType: SceneType;
  pointOfViewCharacterId: string;
  goal: string;
  conflict: string;
  outcome: string;
  textDraft: string;
};

export type NormalizedSceneFormValues = {
  title: string;
  summary: string;
  description: string;
  status: SceneStatus;
  bookId: string | null;
  chapterId: string | null;
  sceneNumber: number | null;
  sceneType: SceneType;
  pointOfViewCharacterId: string | null;
  goal: string;
  conflict: string;
  outcome: string;
  textDraft: string;
};

type BuildSceneDocumentInput = {
  id: string;
  projectId: string;
  values: NormalizedSceneFormValues;
};

export type SceneDocumentData = Omit<Scene, "createdAt" | "updatedAt">;

export const SCENE_STATUS_OPTIONS: ReadonlyArray<{
  value: SceneStatus;
  label: string;
}> = [
  { value: "outline", label: "Outline" },
  { value: "drafting", label: "Drafting" },
  { value: "revising", label: "Revising" },
  { value: "complete", label: "Complete" },
  { value: "archived", label: "Archived" },
];

export const SCENE_TYPE_OPTIONS: ReadonlyArray<{
  value: SceneType;
  label: string;
}> = [
  { value: "opening", label: "Opening" },
  { value: "setup", label: "Setup" },
  { value: "conflict", label: "Conflict" },
  { value: "reaction", label: "Reaction" },
  { value: "revelation", label: "Revelation" },
  { value: "transition", label: "Transition" },
  { value: "climax", label: "Climax" },
  { value: "aftermath", label: "Aftermath" },
  { value: "other", label: "Other" },
];

const DEFAULT_SCENE_STATUS: SceneStatus = "outline";
const DEFAULT_SCENE_CANON_LEVEL: SceneCanonLevel = "working";
const DEFAULT_SCENE_CONFIDENCE: SceneConfidence = "medium";
const DEFAULT_SCENE_TYPE: SceneType = "other";

export function createEmptySceneFormValues(): SceneFormValues {
  return {
    title: "",
    summary: "",
    description: "",
    status: DEFAULT_SCENE_STATUS,
    bookId: "",
    chapterId: "",
    sceneNumber: "",
    sceneType: DEFAULT_SCENE_TYPE,
    pointOfViewCharacterId: "",
    goal: "",
    conflict: "",
    outcome: "",
    textDraft: "",
  };
}

export function sceneToFormValues(scene: Scene): SceneFormValues {
  return {
    title: scene.title,
    summary: scene.summary,
    description: scene.description,
    status: scene.status,
    bookId: scene.bookId ?? "",
    chapterId: scene.chapterId ?? "",
    sceneNumber: typeof scene.sceneNumber === "number" ? String(scene.sceneNumber) : "",
    sceneType: scene.sceneType,
    pointOfViewCharacterId: scene.pointOfViewCharacterId ?? "",
    goal: scene.goal,
    conflict: scene.conflict,
    outcome: scene.outcome,
    textDraft: scene.textDraft,
  };
}

export function normalizeSceneFormValues(
  values: SceneFormValues
): NormalizedSceneFormValues {
  return {
    title: values.title.trim(),
    summary: values.summary.trim(),
    description: values.description.trim(),
    status: coerceSceneStatus(values.status),
    bookId: values.bookId.trim() || null,
    chapterId: values.chapterId.trim() || null,
    sceneNumber: parseIntegerOrNull(values.sceneNumber),
    sceneType: coerceSceneType(values.sceneType),
    pointOfViewCharacterId: values.pointOfViewCharacterId.trim() || null,
    goal: values.goal.trim(),
    conflict: values.conflict.trim(),
    outcome: values.outcome.trim(),
    textDraft: values.textDraft.trim(),
  };
}

export function buildSceneDocument({
  id,
  projectId,
  values,
}: BuildSceneDocumentInput): SceneDocumentData {
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
    canonLevel: DEFAULT_SCENE_CANON_LEVEL,
    confidence: DEFAULT_SCENE_CONFIDENCE,
    bookId: values.bookId,
    chapterId: values.chapterId,
    sceneNumber: values.sceneNumber,
    sceneType: values.sceneType,
    pointOfViewCharacterId: values.pointOfViewCharacterId,
    goal: values.goal,
    conflict: values.conflict,
    outcome: values.outcome,
    textDraft: values.textDraft,
    timelineEventIds: [],
    characterIds: [],
    locationIds: [],
    plotThreadIds: [],
  };
}

export function coerceSceneStatus(value: unknown): SceneStatus {
  if (isAllowedValue(SCENE_STATUS_VALUES, value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");

    if (normalized === "draft") {
      return "drafting";
    }

    if (normalized === "revision" || normalized === "revised") {
      return "revising";
    }

    if (normalized === "completed") {
      return "complete";
    }
  }

  return DEFAULT_SCENE_STATUS;
}

export function coerceSceneCanonLevel(value: unknown): SceneCanonLevel {
  return isAllowedValue(SCENE_CANON_LEVEL_VALUES, value)
    ? value
    : DEFAULT_SCENE_CANON_LEVEL;
}

export function coerceSceneConfidence(value: unknown): SceneConfidence {
  if (isAllowedValue(SCENE_CONFIDENCE_VALUES, value)) {
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

  return DEFAULT_SCENE_CONFIDENCE;
}

export function coerceSceneType(value: unknown): SceneType {
  if (isAllowedValue(SCENE_TYPE_VALUES, value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");

    if (normalized === "intro" || normalized === "introduction") {
      return "opening";
    }

    if (normalized === "action") {
      return "conflict";
    }

    if (normalized === "fallout") {
      return "aftermath";
    }
  }

  return DEFAULT_SCENE_TYPE;
}

export function slugifySceneTitle(value: string) {
  return slugify(value);
}

function isAllowedValue<const Values extends readonly string[]>(
  values: Values,
  value: unknown
): value is Values[number] {
  return typeof value === "string" && values.includes(value);
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
      .replace(/^-+|-+$/g, "") || "scene"
  );
}
