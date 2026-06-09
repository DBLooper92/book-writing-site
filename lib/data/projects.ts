import "client-only";

import type { Json } from "@/types/database";
import type { ProfileOwnerContext } from "@/lib/data/profiles";

export type ProjectOwnerContext = ProfileOwnerContext;

export type UserProject = {
  id: string;
  path: string;
  title: string;
  slug: string | null;
  summary: string | null;
  status: string;
};

export type ProjectRecord = {
  id: string;
  userId: string;
  ownerId: string;
  title: string;
  slug: string | null;
  summary: string | null;
  description: string | null;
  genre: string | null;
  tone: string | null;
  themes: string[];
  timelineStartYear: number | null;
  timelineEndYear: number | null;
  defaultCalendarSystemId: string | null;
  primaryPointOfViewStyle: string | null;
  writingStatus: string | null;
  bookOrderMode: string | null;
  notesRootId: string | null;
  settings: Json;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export async function listUserProjects(_uid: string) {
  const recentProjects = await window.bookBible.launcher.listRecentProjects();

  return recentProjects.map((project) => ({
    id: project.id,
    path: project.path,
    title: project.title,
    slug: project.id,
    summary: project.missing ? "Project folder is missing." : "Local desktop project.",
    status: project.missing ? "missing" : "active",
  })) satisfies UserProject[];
}

export function listUserProjectsSync(_uid: string) {
  if (typeof window === "undefined") {
    return [] satisfies UserProject[];
  }

  const recentProjects = window.bookBible.launcher.listRecentProjectsSync();

  return recentProjects.map((project) => ({
    id: project.id,
    path: project.path,
    title: project.title,
    slug: project.id,
    summary: project.missing ? "Project folder is missing." : "Local desktop project.",
    status: project.missing ? "missing" : "active",
  })) satisfies UserProject[];
}

export async function getProjectById(_uid: string, projectId: string) {
  const currentProject = await window.bookBible.project.getCurrent();

  if (!currentProject || currentProject.id !== projectId) {
    return null;
  }

  return normalizeProjectRecord(currentProject.projectRecord);
}

export async function getActiveProjectId(_uid: string) {
  const currentProject = await window.bookBible.project.getCurrent();
  return currentProject?.id ?? null;
}

export async function getActiveProjectPath(_uid: string) {
  const currentProject = await window.bookBible.project.getCurrent();
  return currentProject?.path ?? null;
}

export function getActiveProjectIdSync(_uid: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const currentProject = window.bookBible.project.getCurrentSync();
  return currentProject?.id ?? null;
}

export function getActiveProjectPathSync(_uid: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const currentProject = window.bookBible.project.getCurrentSync();
  return currentProject?.path ?? null;
}

export async function setActiveProjectForUser(_uid: string, projectPath: string) {
  const recentProjects = await window.bookBible.launcher.listRecentProjects();
  const matchingProject =
    recentProjects.find((project) => project.path === projectPath) ??
    recentProjects.find((project) => project.id === projectPath);

  if (!matchingProject || matchingProject.missing) {
    throw new Error("The selected project could not be opened from recents.");
  }

  await window.bookBible.launcher.openProjectAtPath(matchingProject.path);
}

export async function createProjectForUser(_owner: ProjectOwnerContext, title: string) {
  const currentProject = await window.bookBible.launcher.createProject({ title });
  return currentProject.id;
}

export async function renameProjectForUser(_uid: string, projectId: string, title: string) {
  const currentProject = await window.bookBible.project.getCurrent();

  if (!currentProject || currentProject.id !== projectId) {
    throw new Error("Only the currently open desktop project can be renamed.");
  }

  await window.bookBible.project.rename(title);
}

export async function deleteProjectForUser(_uid: string, projectId: string) {
  const currentProject = await window.bookBible.project.getCurrent();

  if (!currentProject || currentProject.id !== projectId) {
    throw new Error("Only the currently open desktop project can be deleted.");
  }

  await window.bookBible.project.deleteCurrent();
}

function normalizeProjectRecord(projectRecord: {
  id: string;
  title: string;
  slug: string | null;
  summary: string | null;
  description: string | null;
  genre: string | null;
  tone: string | null;
  themes: string[];
  timeline_start_year: number | null;
  timeline_end_year: number | null;
  default_calendar_system_id: string | null;
  primary_point_of_view_style: string | null;
  writing_status: string | null;
  book_order_mode: string | null;
  notes_root_id: string | null;
  settings: Json;
  status: string;
  created_at: string;
  updated_at: string;
}): ProjectRecord {
  return {
    id: projectRecord.id,
    userId: "local-desktop",
    ownerId: "local-desktop",
    title: projectRecord.title,
    slug: projectRecord.slug,
    summary: projectRecord.summary,
    description: projectRecord.description,
    genre: projectRecord.genre,
    tone: projectRecord.tone,
    themes: projectRecord.themes ?? [],
    timelineStartYear: projectRecord.timeline_start_year,
    timelineEndYear: projectRecord.timeline_end_year,
    defaultCalendarSystemId: projectRecord.default_calendar_system_id,
    primaryPointOfViewStyle: projectRecord.primary_point_of_view_style,
    writingStatus: projectRecord.writing_status,
    bookOrderMode: projectRecord.book_order_mode,
    notesRootId: projectRecord.notes_root_id,
    settings: projectRecord.settings,
    status: projectRecord.status,
    createdAt: projectRecord.created_at,
    updatedAt: projectRecord.updated_at,
  };
}
