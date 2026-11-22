import { describe, expect, it } from "vitest";
import type { Highlight } from "../annotations/types";
import { extractHeadings } from "./headings";
import { buildGroups, filterGroups, GROUP_LIMIT, type PaletteInput } from "./items";

function highlight(id: string, quote: string, comment: string | null = null): Highlight {
  return {
    id,
    quote,
    prefix: "",
    suffix: "",
    offset: 0,
    color: "green",
    comment,
    status: "anchored",
    created: "2026-11-22T00:00:00Z",
    updated: "2026-11-22T00:00:00Z",
  };
}

const input: PaletteInput = {
  tree: [
    {
      kind: "directory",
      name: "lectures",
      path: "/v/lectures",
      children: [
        { kind: "file", name: "04-spacing.md", path: "/v/lectures/04-spacing.md" },
        {
          kind: "directory",
          name: "old",
          path: "/v/lectures/old",
          children: [{ kind: "file", name: "01-intro.md", path: "/v/lectures/old/01-intro.md" }],
        },
      ],
    },
    { kind: "file", name: "README.md", path: "/v/README.md" },
  ],
  headings: [
    { depth: 1, text: "Why spacing works", offset: 0 },
    { depth: 2, text: "Scheduling", offset: 40 },
  ],
  highlights: [
    highlight("a", "Most loss\nhappens early"),
    highlight("b", "Better ones", "Track  it"),
  ],
  hasDocument: true,
  theme: "dark",
};

const labels = (groups: ReturnType<typeof filterGroups>) =>
  groups.map((g) => [g.heading, g.items.map((i) => i.label)]);

describe("extractHeadings", () => {
  it("lists headings in order with plain text and source offsets", () => {
    const source =
      "# Why *spacing* works\n\ntext\n\n## `Scheduling`\n\n```\n# not a heading\n```\n\n#\n";
    expect(extractHeadings(source)).toEqual([
      { depth: 1, text: "Why spacing works", offset: 0 },
      { depth: 2, text: "Scheduling", offset: source.indexOf("## ") },
    ]);
  });

  it("finds setext headings and headings inside blockquotes", () => {
    const source = "Title\n=====\n\n> ### Quoted\n";
    expect(extractHeadings(source)).toEqual([
      { depth: 1, text: "Title", offset: 0 },
      { depth: 3, text: "Quoted", offset: source.indexOf("###") },
    ]);
  });
});

describe("buildGroups", () => {
  it("groups headings, files, notes and commands in that order", () => {
    const groups = buildGroups(input);
    expect(labels(groups)).toEqual([
      ["Headings", ["Why spacing works", "Scheduling"]],
      ["Files", ["04-spacing.md", "01-intro.md", "README.md"]],
      ["Notes", ["Most loss happens early", "Track it"]],
      [
        "Commands",
        [
          "Open file…",
          "Open folder…",
          "Toggle notes",
          "Theme: System",
          "Theme: Light",
          "Theme: Dark",
        ],
      ],
    ]);
  });

  it("shows each file's folder and each comment's quote as detail", () => {
    const [, files, notes] = buildGroups(input);
    expect(files.items.map((i) => ("detail" in i ? i.detail : null))).toEqual([
      "lectures",
      "lectures/old",
      "",
    ]);
    expect(notes.items.map((i) => ("detail" in i ? i.detail : null))).toEqual(["", "Better ones"]);
  });

  it("checks the current theme and drops document commands with no document", () => {
    const commands = buildGroups({ ...input, hasDocument: false })[3].items;
    expect(commands.map((c) => c.label)).not.toContain("Toggle notes");
    expect(commands.filter((c) => c.kind === "command" && c.checked).map((c) => c.label)).toEqual([
      "Theme: Dark",
    ]);
  });
});

describe("filterGroups", () => {
  const groups = buildGroups(input);

  it("keeps everything for an empty query", () => {
    expect(filterGroups(groups, "  ")).toEqual(groups);
  });

  it("drops groups with no match and needs every word", () => {
    expect(labels(filterGroups(groups, "sched"))).toEqual([["Headings", ["Scheduling"]]]);
    expect(labels(filterGroups(groups, "theme li"))).toEqual([["Commands", ["Theme: Light"]]]);
    expect(filterGroups(groups, "zzz")).toEqual([]);
  });

  it("matches case-insensitively and in the detail", () => {
    expect(labels(filterGroups(groups, "LECTURES/OLD"))).toEqual([["Files", ["01-intro.md"]]]);
    expect(labels(filterGroups(groups, "better"))).toEqual([["Notes", ["Track it"]]]);
  });

  it("ranks label starts before word starts before the middle of a word", () => {
    const items = ["xspacing", "spacing", "a spacing"].map((text, i) => ({
      depth: 1,
      text,
      offset: i,
    }));
    const ranked = filterGroups(buildGroups({ ...input, headings: items }), "spacing");
    expect(ranked[0].items.map((i) => i.label)).toEqual(["spacing", "a spacing", "xspacing"]);
  });

  it("cuts each group to the limit", () => {
    const many = Array.from({ length: GROUP_LIMIT + 10 }, (_, i) => ({
      depth: 2,
      text: `Part ${i}`,
      offset: i,
    }));
    const [headings] = filterGroups(buildGroups({ ...input, headings: many }), "part");
    expect(headings.items).toHaveLength(GROUP_LIMIT);
  });
});
