import { afterEach, describe, expect, it, vi } from "vitest";

import { getActiveProjectIdSync, listUserProjectsSync } from "./projects";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("desktop project sync helpers", () => {
  it("reads recent projects and active project synchronously", () => {
    vi.stubGlobal("window", {
      bookBible: {
        launcher: {
          listRecentProjectsSync: () => [
            {
              id: "hard-time",
              title: "Hard Time",
              missing: false,
            },
            {
              id: "digital-prison",
              title: "Digital Prison",
              missing: true,
            },
          ],
        },
        project: {
          getCurrentSync: () => ({
            id: "hard-time",
          }),
        },
      },
    });

    expect(listUserProjectsSync("local-desktop")).toEqual([
      {
        id: "hard-time",
        title: "Hard Time",
        slug: "hard-time",
        summary: "Local desktop project.",
        status: "active",
      },
      {
        id: "digital-prison",
        title: "Digital Prison",
        slug: "digital-prison",
        summary: "Project folder is missing.",
        status: "missing",
      },
    ]);
    expect(getActiveProjectIdSync("local-desktop")).toBe("hard-time");
  });
});
