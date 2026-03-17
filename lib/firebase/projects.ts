import "client-only";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";

export type ProjectOwnerContext = {
  uid: string;
  email: string | null;
  displayName: string | null;
};

export type UserProject = {
  id: string;
  title: string;
  slug: string | null;
  summary: string | null;
  status: string;
};

export function observeUserProjects(
  uid: string,
  callback: (projects: UserProject[]) => void
): Unsubscribe {
  const projectsRef = collection(db, "users", uid, "projects");

  return onSnapshot(projectsRef, (snapshot) => {
    const projects = snapshot.docs
      .map((projectDoc) => {
        const data = projectDoc.data();

        return {
          id: projectDoc.id,
          title: readString(data.title) ?? projectDoc.id,
          slug: readString(data.slug),
          summary: readString(data.summary),
          status: readString(data.status) ?? "active",
        };
      })
      .sort((left, right) => left.title.localeCompare(right.title));

    callback(projects);
  });
}

export function observeActiveProjectId(
  uid: string,
  callback: (projectId: string | null) => void
): Unsubscribe {
  const userRef = doc(db, "users", uid);

  return onSnapshot(userRef, (snapshot) => {
    const data = snapshot.data();
    callback(readString(data?.activeProjectId));
  });
}

export async function setActiveProjectForUser(uid: string, projectId: string) {
  await setDoc(
    doc(db, "users", uid),
    {
      activeProjectId: projectId,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function createProjectForUser(
  owner: ProjectOwnerContext,
  title: string
) {
  const normalizedTitle = title.trim();

  if (!normalizedTitle) {
    throw new Error("Enter a project name.");
  }

  await ensureUserDoc(owner);

  const baseSlug = slugify(normalizedTitle);
  const projectId = await getAvailableProjectId(owner.uid, baseSlug);
  const projectRef = doc(db, "users", owner.uid, "projects", projectId);

  await setDoc(projectRef, {
    id: projectId,
    ownerId: owner.uid,
    title: normalizedTitle,
    slug: projectId,
    summary: `Story bible project for ${normalizedTitle}.`,
    description: `Project workspace for ${normalizedTitle}.`,
    genre: "Unassigned",
    tone: "Undecided",
    themes: [],
    timelineStartYear: null,
    timelineEndYear: null,
    defaultCalendarSystemId: "calendar_standard_solar",
    primaryPointOfViewStyle: "Undecided",
    writingStatus: "planning",
    bookOrderMode: "series-order",
    notesRootId: null,
    settings: {
      allowPublicWiki: false,
      allowAIWriting: true,
      allowAIEditing: true,
      defaultTimelineScale: "year",
      defaultLanguageId: null,
      spoilerPolicy: "internal-only",
    },
    status: "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await setActiveProjectForUser(owner.uid, projectId);

  return projectId;
}

export async function renameProjectForUser(
  uid: string,
  projectId: string,
  title: string
) {
  const normalizedTitle = title.trim();

  if (!normalizedTitle) {
    throw new Error("Project name cannot be empty.");
  }

  await setDoc(
    doc(db, "users", uid, "projects", projectId),
    {
      title: normalizedTitle,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

async function ensureUserDoc(owner: ProjectOwnerContext) {
  const userRef = doc(db, "users", owner.uid);
  const userSnapshot = await getDoc(userRef);

  await setDoc(
    userRef,
    userSnapshot.exists()
      ? {
          id: owner.uid,
          email: owner.email ?? null,
          displayName: owner.displayName ?? null,
          role: "owner",
          plan: "personal",
          status: "active",
          updatedAt: serverTimestamp(),
        }
      : {
          id: owner.uid,
          email: owner.email ?? null,
          displayName: owner.displayName ?? null,
          role: "owner",
          plan: "personal",
          status: "active",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
        },
    { merge: true }
  );
}

async function getAvailableProjectId(uid: string, baseSlug: string) {
  let candidate = baseSlug;
  let suffix = 2;

  while ((await getDoc(doc(db, "users", uid, "projects", candidate))).exists()) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "project";
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
}
