import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { countNotes, extractHeadings, headingInView, type Heading } from "./headings";
import { Markdown } from "./Markdown";

describe("extractHeadings", () => {
  it("lists headings in order with depth, text and source offset", () => {
    const source = "# Title\n\nIntro.\n\n## First *part*\n\nText.\n\n### `code` here\n";
    expect(extractHeadings(source)).toEqual([
      { depth: 1, text: "Title", id: "title", start: 0 },
      { depth: 2, text: "First part", id: "first-part", start: source.indexOf("## First") },
      { depth: 3, text: "code here", id: "code-here", start: source.indexOf("### ") },
    ]);
  });

  it("finds setext headings and ignores # in code blocks", () => {
    const source = "Title\n=====\n\n```\n# not a heading\n```\n\nSub\n---\n";
    expect(extractHeadings(source).map((h) => [h.depth, h.text])).toEqual([
      [1, "Title"],
      [2, "Sub"],
    ]);
  });

  it("gives the same ids as the reader, duplicates included", () => {
    const source = "# Notes\n\n## Notes\n\n## Ünïcode & symbols!\n";
    const html = renderToStaticMarkup(
      createElement(Markdown, { source, resolveImageSrc: (src) => src, onLinkClick: () => {} }),
    );
    const ids = extractHeadings(source).map((h) => h.id);
    expect(ids).toEqual(["notes", "notes-1", "ünïcode--symbols"]);
    for (const id of ids) expect(html).toContain(`id="${id}"`);
  });

  it("finds headings in blockquotes and leaves out empty ones", () => {
    const source = "# One\n\n> ### Quoted\n\n#\n";
    expect(extractHeadings(source).map((h) => [h.text, h.start])).toEqual([
      ["One", 0],
      ["Quoted", source.indexOf("###")],
    ]);
  });

  it("returns nothing for a document without headings", () => {
    expect(extractHeadings("Just a paragraph.\n")).toEqual([]);
  });
});

describe("countNotes", () => {
  const headings: Heading[] = [
    { depth: 1, text: "A", id: "a", start: 10 },
    { depth: 2, text: "B", id: "b", start: 50 },
    { depth: 2, text: "C", id: "c", start: 90 },
  ];

  it("counts highlights in each heading's own section", () => {
    expect(countNotes(headings, [12, 49, 50, 60, 95, 500])).toEqual([2, 2, 2]);
  });

  it("skips highlights above the first heading", () => {
    expect(countNotes(headings, [0, 9])).toEqual([0, 0, 0]);
  });
});

describe("headingInView", () => {
  it("picks the last heading at or above the line", () => {
    expect(headingInView([0, 300, 900], 80)).toBe(0);
    expect(headingInView([-400, 60, 500], 80)).toBe(1);
    expect(headingInView([-900, -500, 80], 80)).toBe(2);
  });

  it("is -1 before the first heading and for no headings", () => {
    expect(headingInView([200, 600], 80)).toBe(-1);
    expect(headingInView([], 80)).toBe(-1);
  });
});
