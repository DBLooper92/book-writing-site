import "client-only";

import {
  getActiveProjectId,
  listUserProjects,
  setActiveProjectForUser,
} from "@/lib/data/projects";

const LAST_APP_ROUTE_STORAGE_KEY = "bookwritingsite:last-app-route";

type RememberedAppRoute = {
  uid: string;
  activeProjectId: string;
  path: string;
  savedAt: string;
};

export function rememberLastAppRoute({
  uid,
  activeProjectId,
  pathname,
}: {
  uid: string | null;
  activeProjectId: string | null;
  pathname: string;
}) {
  if (
    typeof window === "undefined" ||
    !uid ||
    !activeProjectId ||
    !isRestorableAppPath(pathname)
  ) {
    return;
  }

  const payload: RememberedAppRoute = {
    uid,
    activeProjectId,
    path: pathname,
    savedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(LAST_APP_ROUTE_STORAGE_KEY, JSON.stringify(payload));
}

export function clearRememberedAppRoute() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(LAST_APP_ROUTE_STORAGE_KEY);
}

export async function resolvePostSignInPath(uid: string) {
  const [projects, storedActiveProjectId] = await Promise.all([
    listUserProjects(uid),
    getActiveProjectId(uid),
  ]);

  if (projects.length === 0) {
    return "/projects/new";
  }

  const availableProjectIds = new Set(projects.map((project) => project.id));
  let activeProjectId = storedActiveProjectId;

  if (!activeProjectId || !availableProjectIds.has(activeProjectId)) {
    activeProjectId = projects[0]?.id ?? null;

    if (activeProjectId) {
      await setActiveProjectForUser(uid, activeProjectId);
    }
  }

  if (!activeProjectId) {
    return "/projects/new";
  }

  const rememberedRoute = readRememberedAppRoute();

  if (
    rememberedRoute &&
    rememberedRoute.uid === uid &&
    rememberedRoute.activeProjectId === activeProjectId &&
    isRestorableAppPath(rememberedRoute.path)
  ) {
    return rememberedRoute.path;
  }

  return "/timeline";
}

function readRememberedAppRoute() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(LAST_APP_ROUTE_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<RememberedAppRoute>;

    if (
      typeof parsed.uid === "string" &&
      typeof parsed.activeProjectId === "string" &&
      typeof parsed.path === "string" &&
      typeof parsed.savedAt === "string"
    ) {
      return parsed as RememberedAppRoute;
    }
  } catch {
    window.localStorage.removeItem(LAST_APP_ROUTE_STORAGE_KEY);
  }

  return null;
}

function isRestorableAppPath(pathname: string) {
  if (!pathname || pathname === "/" || pathname === "/projects/new") {
    return false;
  }

  return ![
    "/auth",
    "/backend-test",
    "/dev/setup",
  ].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
