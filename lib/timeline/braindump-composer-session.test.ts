import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearBrainDumpComposerSession,
  createBrainDumpComposerCard,
  createEmptyBrainDumpComposerSession,
  loadBrainDumpComposerSession,
  saveBrainDumpComposerSession,
} from "./braindump-composer-session";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("braindump composer session", () => {
  it("creates a default session with one AI card", () => {
    const session = createEmptyBrainDumpComposerSession("project-1", "notch-a-b");

    expect(session.projectId).toBe("project-1");
    expect(session.insertionItemId).toBe("notch-a-b");
    expect(session.cards).toHaveLength(1);
    expect(session.cards[0].type).toBe("ai");
  });

  it("round-trips through localStorage", () => {
    const storage = new Map<string, string>();
    const localStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      removeItem: (key: string) => {
        storage.delete(key);
      },
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    } as Storage;

    vi.stubGlobal("window", {
      dispatchEvent: vi.fn(),
      localStorage,
    });

    const session = createEmptyBrainDumpComposerSession("project-1", "notch-a-b");
    session.cards.push(createBrainDumpComposerCard("manual"));
    session.cards[0].text = "Alpha";
    session.cards[1].text = "Beta";

    saveBrainDumpComposerSession(session);
    const loaded = loadBrainDumpComposerSession("project-1", "notch-a-b");

    expect(loaded?.cards).toHaveLength(2);
    expect(loaded?.cards[0].text).toBe("Alpha");
    expect(loaded?.cards[1].type).toBe("manual");

    clearBrainDumpComposerSession("project-1", "notch-a-b");
    expect(loadBrainDumpComposerSession("project-1", "notch-a-b")).toBeNull();
  });
});
