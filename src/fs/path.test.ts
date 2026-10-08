import { describe, expect, it } from "vitest";
import { baseName, isMarkdownFile, joinPath, resolveRelative } from "./path";

describe("joinPath", () => {
  it("joins with a forward slash", () => {
    expect(joinPath("/home/me/notes", "week1.md")).toBe("/home/me/notes/week1.md");
  });

  it("keeps Windows separators", () => {
    expect(joinPath("C:\\docs\\os", "week1.md")).toBe("C:\\docs\\os\\week1.md");
  });

  it("does not double a trailing separator", () => {
    expect(joinPath("C:\\", "notes")).toBe("C:\\notes");
    expect(joinPath("/home/me/", "notes")).toBe("/home/me/notes");
  });
});

describe("baseName", () => {
  it("returns the last segment for either separator", () => {
    expect(baseName("/home/me/notes")).toBe("notes");
    expect(baseName("C:\\docs\\week1.md")).toBe("week1.md");
    expect(baseName("C:\\docs\\")).toBe("docs");
  });
});

describe("isMarkdownFile", () => {
  it("accepts .md and .markdown in any case", () => {
    expect(isMarkdownFile("README.md")).toBe(true);
    expect(isMarkdownFile("notes.MARKDOWN")).toBe(true);
  });

  it("rejects other files", () => {
    expect(isMarkdownFile("week1.md.json")).toBe(false);
    expect(isMarkdownFile("image.png")).toBe(false);
  });
});

describe("resolveRelative", () => {
  it("resolves next to the file", () => {
    expect(resolveRelative("/home/me/notes/week1.md", "img/a.png")).toBe(
      "/home/me/notes/img/a.png",
    );
    expect(resolveRelative("/home/me/notes/week1.md", "./a.png")).toBe("/home/me/notes/a.png");
  });

  it("climbs with .. and keeps Windows separators", () => {
    expect(resolveRelative("C:\\docs\\os\\week1.md", "../img/a.png")).toBe("C:\\docs\\img\\a.png");
  });

  it("stops at the root", () => {
    expect(resolveRelative("/notes/a.md", "../../../b.md")).toBe("/b.md");
    expect(resolveRelative("C:\\a.md", "../b.md")).toBe("C:\\b.md");
  });
});
