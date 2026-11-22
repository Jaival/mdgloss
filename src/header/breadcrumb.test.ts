import { describe, expect, it } from "vitest";
import { breadcrumb, countLabel } from "./breadcrumb";

describe("breadcrumb", () => {
  it("starts at the open folder's name", () => {
    expect(breadcrumb("C:\\notes\\os\\week1.md", "C:\\notes")).toEqual({
      folders: ["notes", "os"],
      file: "week1.md",
    });
  });

  it("shows only the folder for a file at the folder's top level", () => {
    expect(breadcrumb("/home/me/notes/week1.md", "/home/me/notes")).toEqual({
      folders: ["notes"],
      file: "week1.md",
    });
  });

  it("accepts a trailing separator on the folder", () => {
    expect(breadcrumb("/home/me/notes/a/b.md", "/home/me/notes/")).toEqual({
      folders: ["notes", "a"],
      file: "b.md",
    });
  });

  it("shows the parent folder for a single file", () => {
    expect(breadcrumb("C:\\docs\\os\\week1.md", null)).toEqual({
      folders: ["os"],
      file: "week1.md",
    });
  });

  it("shows the parent folder for a file outside the open folder", () => {
    expect(breadcrumb("/home/me/other/x.md", "/home/me/notes")).toEqual({
      folders: ["other"],
      file: "x.md",
    });
  });

  it("does not match a folder that only shares a prefix", () => {
    expect(breadcrumb("/home/me/notes-old/x.md", "/home/me/notes")).toEqual({
      folders: ["notes-old"],
      file: "x.md",
    });
  });

  it("has no folders for a bare file name", () => {
    expect(breadcrumb("week1.md", null)).toEqual({ folders: [], file: "week1.md" });
  });
});

describe("countLabel", () => {
  it("uses the singular for one", () => {
    expect(countLabel(1, "highlight", "highlights")).toBe("1 highlight");
  });

  it("uses the plural otherwise", () => {
    expect(countLabel(0, "highlight", "highlights")).toBe("0 highlights");
    expect(countLabel(4, "highlight", "highlights")).toBe("4 highlights");
  });
});
