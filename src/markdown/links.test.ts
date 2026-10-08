import { describe, expect, it } from "vitest";
import { classifyLink, isExternalUrl, resolveImage } from "./links";

const doc = "/home/me/notes/os/week1.md";

describe("isExternalUrl", () => {
  it("recognises schemes and protocol-relative URLs", () => {
    expect(isExternalUrl("https://example.com")).toBe(true);
    expect(isExternalUrl("mailto:me@example.com")).toBe(true);
    expect(isExternalUrl("data:image/png;base64,AAAA")).toBe(true);
    expect(isExternalUrl("//cdn.example.com/a.png")).toBe(true);
  });

  it("treats relative paths and Windows drives as local", () => {
    expect(isExternalUrl("img/a.png")).toBe(false);
    expect(isExternalUrl("../a.md")).toBe(false);
    expect(isExternalUrl("C:\\img\\a.png")).toBe(false);
  });
});

describe("resolveImage", () => {
  it("resolves relative images against the document", () => {
    expect(resolveImage(doc, "../img/process%20states.png")).toEqual({
      type: "file",
      url: "/home/me/notes/img/process states.png",
    });
  });

  it("leaves external images alone", () => {
    expect(resolveImage(doc, "https://example.com/a.png")).toEqual({
      type: "external",
      url: "https://example.com/a.png",
    });
  });
});

describe("classifyLink", () => {
  it("handles in-page anchors", () => {
    expect(classifyLink(doc, "#priority-scheduling")).toEqual({
      type: "anchor",
      id: "priority-scheduling",
    });
  });

  it("opens other markdown files in the app, ignoring the fragment", () => {
    expect(classifyLink(doc, "week2.md#threads")).toEqual({
      type: "markdown",
      path: "/home/me/notes/os/week2.md",
    });
  });

  it("separates external links and other local files", () => {
    expect(classifyLink(doc, "https://example.com")).toEqual({
      type: "external",
      url: "https://example.com",
    });
    expect(classifyLink(doc, "slides.pdf")).toEqual({
      type: "other",
      path: "/home/me/notes/os/slides.pdf",
    });
  });
});
