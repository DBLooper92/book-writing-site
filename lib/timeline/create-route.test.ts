import { describe, expect, it } from "vitest";

import {
  buildTimelineCreateHref,
  clearTimelineCreateSearchParams,
  getTimelineCreateMode,
  hasTimelineCreateSearchParams,
} from "./create-route";

describe("timeline create-route mode", () => {
  it("defaults to chooser mode when unspecified", () => {
    const params = new URLSearchParams("compose=new");
    expect(hasTimelineCreateSearchParams(params)).toBe(true);
    expect(getTimelineCreateMode(params)).toBe("chooser");
  });

  it("preserves explicit mode and existing prefill keys", () => {
    const href = buildTimelineCreateHref({
      createMode: "aiSingle",
      predecessorEventIds: ["event_a"],
      yearStart: "742",
    });
    const params = new URLSearchParams(href.split("?")[1]);

    expect(params.get("compose")).toBe("new");
    expect(params.get("createMode")).toBe("aiSingle");
    expect(params.get("predecessorEventIds")).toBe("event_a");
    expect(params.get("yearStart")).toBe("742");
  });

  it("maps legacy ai mode query to aiSingle", () => {
    const params = new URLSearchParams("compose=new&createMode=ai");
    expect(getTimelineCreateMode(params)).toBe("aiSingle");
  });

  it("clears create flow query keys while leaving unrelated params", () => {
    const params = new URLSearchParams(
      "compose=new&createMode=manual&yearStart=100&foo=bar&successorEventIds=evt1"
    );
    const cleared = clearTimelineCreateSearchParams(params);

    expect(cleared.get("compose")).toBeNull();
    expect(cleared.get("createMode")).toBeNull();
    expect(cleared.get("yearStart")).toBeNull();
    expect(cleared.get("successorEventIds")).toBeNull();
    expect(cleared.get("foo")).toBe("bar");
  });
});
