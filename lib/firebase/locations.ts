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
  buildLocationDocument,
  coerceLocationCanonLevel,
  coerceLocationConfidence,
  coerceLocationStatus,
  slugifyLocationName,
  type Location,
  type NormalizedLocationFormValues,
} from "@/types/location";

export function getLocationDocPath(uid: string, projectId: string, locationId: string) {
  return doc(db, "users", uid, "projects", projectId, "locations", locationId).path;
}

export function observeLocationsForProject(
  uid: string,
  projectId: string,
  callback: (locations: Location[]) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const locationsRef = collection(db, "users", uid, "projects", projectId, "locations");

  return onSnapshot(
    locationsRef,
    (snapshot) => {
      const locations = snapshot.docs
        .map((locationDoc) =>
          normalizeLocationDocument(locationDoc.id, projectId, locationDoc.data())
        )
        .sort((left, right) => left.name.localeCompare(right.name));

      callback(locations);
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export function observeLocationById(
  uid: string,
  projectId: string,
  locationId: string,
  callback: (location: Location | null) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const locationRef = doc(db, "users", uid, "projects", projectId, "locations", locationId);

  return onSnapshot(
    locationRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback(normalizeLocationDocument(snapshot.id, projectId, snapshot.data()));
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export async function getLocationById(
  uid: string,
  projectId: string,
  locationId: string
) {
  const locationRef = doc(db, "users", uid, "projects", projectId, "locations", locationId);
  const snapshot = await getDoc(locationRef);

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeLocationDocument(snapshot.id, projectId, snapshot.data());
}

export async function createLocationForProject(
  uid: string,
  projectId: string,
  values: NormalizedLocationFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Location name is required.");
  }

  const locationId = await getAvailableLocationId(uid, projectId, name);
  const locationRef = doc(db, "users", uid, "projects", projectId, "locations", locationId);
  const locationDocument = buildLocationDocument({
    id: locationId,
    projectId,
    values,
  });

  await setDoc(locationRef, {
    ...locationDocument,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return locationId;
}

export async function updateLocationForProject(
  uid: string,
  projectId: string,
  locationId: string,
  values: NormalizedLocationFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Location name is required.");
  }

  const locationRef = doc(db, "users", uid, "projects", projectId, "locations", locationId);

  await setDoc(
    locationRef,
    {
      projectId,
      name,
      slug: slugifyLocationName(name),
      summary: values.summary,
      description: values.description,
      status: values.status,
      isArchived: values.status === "archived",
      locationType: values.locationType,
      parentLocationId: values.parentLocationId,
      climate: values.climate,
      geography: values.geography,
      architecture: values.architecture,
      customs: values.customs,
      dangerLevel: values.dangerLevel,
      notableFeatures: values.notableFeatures,
      publicWikiSummary: values.publicWikiSummary,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

function normalizeLocationDocument(
  documentId: string,
  projectId: string,
  data: Record<string, unknown> | undefined
): Location {
  const status = coerceLocationStatus(data?.status);
  const explicitIsArchived = readBooleanOrNull(data?.isArchived);

  return {
    id: documentId,
    projectId: readString(data?.projectId) ?? projectId,
    name: readString(data?.name) ?? documentId,
    slug:
      readString(data?.slug) ?? slugifyLocationName(readString(data?.name) ?? documentId),
    summary: readString(data?.summary) ?? "",
    description: readString(data?.description) ?? "",
    status,
    tags: readStringArray(data?.tags),
    isArchived: explicitIsArchived ?? status === "archived",
    canonLevel: coerceLocationCanonLevel(data?.canonLevel),
    confidence: coerceLocationConfidence(data?.confidence),
    locationType: readString(data?.locationType) ?? "settlement",
    parentLocationId: readNullableString(data?.parentLocationId),
    childLocationIds: readStringArray(data?.childLocationIds),
    eraIds: readStringArray(data?.eraIds),
    cultureIds: readStringArray(data?.cultureIds),
    factionIds: readStringArray(data?.factionIds),
    populationNotes: readString(data?.populationNotes) ?? "",
    climate: readString(data?.climate) ?? "",
    geography: readString(data?.geography) ?? "",
    architecture: readString(data?.architecture) ?? "",
    economy: readString(data?.economy) ?? "",
    customs: readStringArray(data?.customs),
    dangerLevel: readString(data?.dangerLevel) ?? "moderate",
    notableFeatures: readStringArray(data?.notableFeatures),
    timelineEventIds: readStringArray(data?.timelineEventIds),
    bookIds: readStringArray(data?.bookIds),
    characterIds: readStringArray(data?.characterIds),
    publicWikiSummary: readString(data?.publicWikiSummary) ?? "",
    createdAt: readTimestamp(data?.createdAt),
    updatedAt: readTimestamp(data?.updatedAt),
  };
}

async function getAvailableLocationId(uid: string, projectId: string, name: string) {
  const baseId = buildLocationId(name);
  let candidateId = baseId;
  let suffix = 2;

  while (
    (await getDoc(doc(db, "users", uid, "projects", projectId, "locations", candidateId)))
      .exists()
  ) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}

function buildLocationId(name: string) {
  const normalized = slugifyLocationName(name).replace(/-/g, "_");
  return `loc_${normalized || "location"}`;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
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

function readBooleanOrNull(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function readTimestamp(value: unknown) {
  return value instanceof Timestamp ? value : null;
}
