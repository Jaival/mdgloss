import { describe, expect, it } from "vitest";
import { toChangeEvents } from "./tauri";

describe("toChangeEvents", () => {
  it("maps create, modify and remove", () => {
    expect(
      toChangeEvents({ type: { create: { kind: "file" } }, paths: ["/a.md"], attrs: null }),
    ).toEqual([{ path: "/a.md", kind: "created" }]);
    expect(
      toChangeEvents({
        type: { modify: { kind: "data", mode: "content" } },
        paths: ["/a.md"],
        attrs: null,
      }),
    ).toEqual([{ path: "/a.md", kind: "modified" }]);
    expect(
      toChangeEvents({ type: { remove: { kind: "file" } }, paths: ["/a.md"], attrs: null }),
    ).toEqual([{ path: "/a.md", kind: "removed" }]);
  });

  it("emits one event per path", () => {
    const events = toChangeEvents({
      type: { modify: { kind: "data", mode: "any" } },
      paths: ["/a.md", "/b.md"],
      attrs: null,
    });
    expect(events.map((e) => e.path)).toEqual(["/a.md", "/b.md"]);
  });

  it("maps a rename to the old path removed and the new one created", () => {
    const rename = (mode: "from" | "to" | "both" | "any", paths: string[]) =>
      toChangeEvents({ type: { modify: { kind: "rename", mode } }, paths, attrs: null });
    expect(rename("both", ["/old.md", "/new.md"])).toEqual([
      { path: "/old.md", kind: "removed" },
      { path: "/new.md", kind: "created" },
    ]);
    expect(rename("from", ["/old.md"])).toEqual([{ path: "/old.md", kind: "removed" }]);
    expect(rename("to", ["/new.md"])).toEqual([{ path: "/new.md", kind: "created" }]);
    expect(rename("any", ["/a.md"])).toEqual([{ path: "/a.md", kind: "modified" }]);
  });

  it("treats unknown kinds as modified", () => {
    expect(toChangeEvents({ type: "any", paths: ["/a.md"], attrs: null })).toEqual([
      { path: "/a.md", kind: "modified" },
    ]);
  });

  it("ignores access events", () => {
    expect(
      toChangeEvents({ type: { access: { kind: "any" } }, paths: ["/a.md"], attrs: null }),
    ).toEqual([]);
  });
});
