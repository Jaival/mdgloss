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
      type: { modify: { kind: "rename", mode: "both" } },
      paths: ["/old.md", "/new.md"],
      attrs: null,
    });
    expect(events.map((e) => e.path)).toEqual(["/old.md", "/new.md"]);
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
