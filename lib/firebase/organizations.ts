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
  buildOrganizationDocument,
  coerceOrganizationCanonLevel,
  coerceOrganizationConfidence,
  coerceOrganizationStatus,
  coerceOrganizationType,
  slugifyOrganizationName,
  type NormalizedOrganizationFormValues,
  type Organization,
} from "@/types/organization";

export function getOrganizationDocPath(
  uid: string,
  projectId: string,
  organizationId: string
) {
  return doc(db, "users", uid, "projects", projectId, "organizations", organizationId).path;
}

export function observeOrganizationsForProject(
  uid: string,
  projectId: string,
  callback: (organizations: Organization[]) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const organizationsRef = collection(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "organizations"
  );

  return onSnapshot(
    organizationsRef,
    (snapshot) => {
      const organizations = snapshot.docs
        .map((organizationDoc) =>
          normalizeOrganizationDocument(
            organizationDoc.id,
            projectId,
            organizationDoc.data()
          )
        )
        .sort((left, right) => left.name.localeCompare(right.name));

      callback(organizations);
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export function observeOrganizationById(
  uid: string,
  projectId: string,
  organizationId: string,
  callback: (organization: Organization | null) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const organizationRef = doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "organizations",
    organizationId
  );

  return onSnapshot(
    organizationRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback(normalizeOrganizationDocument(snapshot.id, projectId, snapshot.data()));
    },
    (error) => {
      errorCallback?.(error);
    }
  );
}

export async function getOrganizationById(
  uid: string,
  projectId: string,
  organizationId: string
) {
  const organizationRef = doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "organizations",
    organizationId
  );
  const snapshot = await getDoc(organizationRef);

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeOrganizationDocument(snapshot.id, projectId, snapshot.data());
}

export async function createOrganizationForProject(
  uid: string,
  projectId: string,
  values: NormalizedOrganizationFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Organization name is required.");
  }

  const organizationId = await getAvailableOrganizationId(uid, projectId, name);
  const organizationRef = doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "organizations",
    organizationId
  );
  const organizationDocument = buildOrganizationDocument({
    id: organizationId,
    projectId,
    values,
  });

  await setDoc(organizationRef, {
    ...organizationDocument,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return organizationId;
}

export async function updateOrganizationForProject(
  uid: string,
  projectId: string,
  organizationId: string,
  values: NormalizedOrganizationFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Organization name is required.");
  }

  const organizationRef = doc(
    db,
    "users",
    uid,
    "projects",
    projectId,
    "organizations",
    organizationId
  );

  await setDoc(
    organizationRef,
    {
      projectId,
      name,
      slug: slugifyOrganizationName(name),
      summary: values.summary,
      description: values.description,
      status: values.status,
      isArchived: values.status === "archived",
      organizationType: values.organizationType,
      foundedYear: values.foundedYear,
      baseLocationIds: values.baseLocationIds,
      leaderTitles: values.leaderTitles,
      memberCountEstimate: values.memberCountEstimate,
      goals: values.goals,
      resources: values.resources,
      alliances: values.alliances,
      publicWikiSummary: values.publicWikiSummary,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

function normalizeOrganizationDocument(
  documentId: string,
  projectId: string,
  data: Record<string, unknown> | undefined
): Organization {
  const status = coerceOrganizationStatus(data?.status);
  const explicitIsArchived = readBooleanOrNull(data?.isArchived);

  return {
    id: documentId,
    projectId: readString(data?.projectId) ?? projectId,
    name: readString(data?.name) ?? documentId,
    slug:
      readString(data?.slug) ??
      slugifyOrganizationName(readString(data?.name) ?? documentId),
    summary: readString(data?.summary) ?? "",
    description: readString(data?.description) ?? "",
    status,
    tags: readStringArray(data?.tags),
    isArchived: explicitIsArchived ?? status === "archived",
    canonLevel: coerceOrganizationCanonLevel(data?.canonLevel),
    confidence: coerceOrganizationConfidence(data?.confidence),
    organizationType: coerceOrganizationType(data?.organizationType),
    foundedYear: readNumberOrNull(data?.foundedYear),
    baseLocationIds: readStringArray(data?.baseLocationIds),
    leaderTitles: readStringArray(data?.leaderTitles),
    memberCountEstimate: readNumberOrNull(data?.memberCountEstimate),
    goals: readStringArray(data?.goals),
    resources: readStringArray(data?.resources),
    alliances: readStringArray(data?.alliances),
    rivals: readStringArray(data?.rivals),
    publicWikiSummary: readString(data?.publicWikiSummary) ?? "",
    createdAt: readTimestamp(data?.createdAt),
    updatedAt: readTimestamp(data?.updatedAt),
  };
}

async function getAvailableOrganizationId(uid: string, projectId: string, name: string) {
  const baseId = buildOrganizationId(name);
  let candidateId = baseId;
  let suffix = 2;

  while (
    (await getDoc(doc(db, "users", uid, "projects", projectId, "organizations", candidateId)))
      .exists()
  ) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}

function buildOrganizationId(name: string) {
  const normalized = slugifyOrganizationName(name).replace(/-/g, "_");
  return `organization_${normalized || "organization"}`;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
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
