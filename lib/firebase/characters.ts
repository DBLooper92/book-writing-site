import "client-only";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import {
  buildCharacterDocument,
  coerceCharacterCanonLevel,
  coerceCharacterConfidence,
  coerceCharacterImportanceLevel,
  coerceCharacterStatus,
  coerceCharacterType,
  slugifyCharacterName,
  type Character,
  type NormalizedCharacterFormValues,
} from "@/types/character";

export function getCharacterDocPath(
  uid: string,
  projectId: string,
  characterId: string
) {
  return doc(db, "users", uid, "projects", projectId, "characters", characterId).path;
}

export function observeCharactersForProject(
  uid: string,
  projectId: string,
  callback: (characters: Character[]) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const charactersRef = collection(db, "users", uid, "projects", projectId, "characters");

  return onSnapshot(
    charactersRef,
    (snapshot) => {
      const characters = snapshot.docs
        .map((characterDoc) =>
          normalizeCharacterDocument(characterDoc.id, projectId, characterDoc.data())
        )
        .sort((left, right) => left.name.localeCompare(right.name));

      callback(characters);
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export function observeCharacterById(
  uid: string,
  projectId: string,
  characterId: string,
  callback: (character: Character | null) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const characterRef = doc(db, "users", uid, "projects", projectId, "characters", characterId);

  return onSnapshot(
    characterRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback(normalizeCharacterDocument(snapshot.id, projectId, snapshot.data()));
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export async function getCharacterById(
  uid: string,
  projectId: string,
  characterId: string
) {
  const characterRef = doc(db, "users", uid, "projects", projectId, "characters", characterId);
  const snapshot = await getDoc(characterRef);

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeCharacterDocument(snapshot.id, projectId, snapshot.data());
}

export async function createCharacterForProject(
  uid: string,
  projectId: string,
  values: NormalizedCharacterFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Character name is required.");
  }

  const characterId = await getAvailableCharacterId(uid, projectId, name);
  const characterRef = doc(db, "users", uid, "projects", projectId, "characters", characterId);
  const characterDocument = buildCharacterDocument({
    id: characterId,
    projectId,
    values,
  });

  await setDoc(characterRef, {
    ...characterDocument,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return characterId;
}

export async function updateCharacterForProject(
  uid: string,
  projectId: string,
  characterId: string,
  values: NormalizedCharacterFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Character name is required.");
  }

  const characterRef = doc(db, "users", uid, "projects", projectId, "characters", characterId);

  await setDoc(
    characterRef,
    {
      projectId,
      name,
      slug: slugifyCharacterName(name),
      summary: values.summary,
      description: values.description,
      status: values.status,
      isArchived: values.status === "archived",
      aliases: values.aliases,
      characterType: values.characterType,
      importanceLevel: values.importanceLevel,
      birthYear: values.birthYear,
      homeLocationId: values.homeLocationId,
      occupation: values.occupation,
      traits: values.traits,
      flaws: values.flaws,
      motivations: values.motivations,
      publicWikiSummary: values.publicWikiSummary,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

function normalizeCharacterDocument(
  documentId: string,
  projectId: string,
  data: Record<string, unknown> | undefined
): Character {
  const status = coerceCharacterStatus(data?.status);
  const homeLocationId = readNullableString(data?.homeLocationId);
  const explicitIsArchived = readBooleanOrNull(data?.isArchived);

  return {
    id: documentId,
    projectId: readString(data?.projectId) ?? projectId,
    name: readString(data?.name) ?? documentId,
    slug:
      readString(data?.slug) ??
      slugifyCharacterName(readString(data?.name) ?? documentId),
    summary: readString(data?.summary) ?? "",
    description: readString(data?.description) ?? "",
    status,
    tags: readStringArray(data?.tags),
    isArchived: explicitIsArchived ?? status === "archived",
    canonLevel: coerceCharacterCanonLevel(data?.canonLevel),
    confidence: coerceCharacterConfidence(data?.confidence),
    aliases: readStringArray(data?.aliases),
    characterType: coerceCharacterType(data?.characterType),
    importanceLevel: coerceCharacterImportanceLevel(data?.importanceLevel),
    birthYear: readNumberOrNull(data?.birthYear),
    deathYear: readNumberOrNull(data?.deathYear),
    apparentAge: readStringLike(data?.apparentAge),
    actualAge: readStringLike(data?.actualAge),
    speciesId: readNullableString(data?.speciesId),
    cultureIds: readStringArray(data?.cultureIds),
    factionIds: readStringArray(data?.factionIds),
    religionIds: readStringArray(data?.religionIds),
    languageIds: readStringArray(data?.languageIds),
    homeLocationId,
    currentLocationId: readNullableString(data?.currentLocationId) ?? homeLocationId,
    occupation: readStringArray(data?.occupation),
    skills: readStringArray(data?.skills),
    traits: readStringArray(data?.traits),
    flaws: readStringArray(data?.flaws),
    motivations: readStringArray(data?.motivations),
    fears: readStringArray(data?.fears),
    secrets: readStringArray(data?.secrets),
    beliefs: readStringArray(data?.beliefs),
    appearance: readString(data?.appearance) ?? "",
    voiceProfile: readString(data?.voiceProfile) ?? "",
    arcSummary: readString(data?.arcSummary) ?? "",
    arcStartState: readString(data?.arcStartState) ?? "",
    arcEndState: readString(data?.arcEndState) ?? "",
    keyRelationshipIds: readStringArray(data?.keyRelationshipIds),
    timelineEventIds: readStringArray(data?.timelineEventIds),
    bookIds: readStringArray(data?.bookIds),
    chapterIds: readStringArray(data?.chapterIds),
    sceneIds: readStringArray(data?.sceneIds),
    importantItems: readStringArray(data?.importantItems),
    publicWikiSummary: readString(data?.publicWikiSummary) ?? "",
    createdAt: readTimestamp(data?.createdAt),
    updatedAt: readTimestamp(data?.updatedAt),
  };
}

async function getAvailableCharacterId(uid: string, projectId: string, name: string) {
  const baseId = buildCharacterId(name);
  let candidateId = baseId;
  let suffix = 2;

  while (
    (
      await getDoc(doc(db, "users", uid, "projects", projectId, "characters", candidateId))
    ).exists()
  ) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}

function buildCharacterId(name: string) {
  const normalized = slugifyCharacterName(name).replace(/-/g, "_");
  return `char_${normalized || "character"}`;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function readStringLike(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return "";
}

function readStringArray(value: unknown) {
  if (typeof value === "string") {
    return value.trim() ? [value.trim()] : [];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function readNumberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readBooleanOrNull(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function readTimestamp(value: unknown) {
  return value instanceof Timestamp ? value : null;
}
