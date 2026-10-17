import { describe, expect, it } from "vitest";
import { emptyAnnotations, parseAnnotations, serializeAnnotations } from "./format";
import type { Highlight } from "./types";

const highlight: Highlight = {
  id: "h_8f2a",
  quote: "a process is a program in execution",
  prefix: "In simple terms, ",
  suffix: ". Each process has",
  offset: 1432,
  color: "yellow",
  comment: "exam definition",
  status: "anchored",
  created: "2026-10-20T14:02:00Z",
  updated: "2026-10-20T14:02:00Z",
};

describe("annotation file format", () => {
  it("starts empty with the current schema version", () => {
    expect(emptyAnnotations("week1.md")).toEqual({
      schemaVersion: 1,
      file: "week1.md",
      highlights: [],
    });
  });

  it("round-trips a file", () => {
    const file = { ...emptyAnnotations("week1.md"), highlights: [highlight] };
    expect(parseAnnotations(serializeAnnotations(file))).toEqual(file);
  });

  it("reads the example from the spec", () => {
    const file = parseAnnotations(
      JSON.stringify({ schemaVersion: 1, file: "week1.md", highlights: [highlight] }),
    );
    expect(file.highlights).toEqual([highlight]);
  });

  it("keeps fields it doesn't manage yet", () => {
    const json = JSON.stringify({
      schemaVersion: 1,
      file: "week1.md",
      lastRead: { offset: 5120 },
      highlights: [{ ...highlight, future: true }],
      bookmarks: [{ id: "b_11c2", target: { type: "file" }, label: null }],
    });
    const saved = JSON.parse(serializeAnnotations(parseAnnotations(json)));
    expect(saved).toEqual(JSON.parse(json));
  });

  it("writes back highlights it can't read, unchanged", () => {
    const broken = { id: "h_bad", quote: 42 };
    const file = parseAnnotations(
      JSON.stringify({ schemaVersion: 1, file: "a.md", highlights: [broken, highlight] }),
    );
    expect(file.highlights).toEqual([highlight]);

    const edited = { ...file, highlights: [] };
    expect(JSON.parse(serializeAnnotations(edited)).highlights).toEqual([broken]);
  });

  it("fills in optional highlight fields", () => {
    const file = parseAnnotations(
      JSON.stringify({
        schemaVersion: 1,
        highlights: [{ id: "h", quote: "x", offset: 0, color: "cyan", status: "lost" }],
      }),
    );
    expect(file.file).toBe("");
    expect(file.highlights[0]).toMatchObject({
      prefix: "",
      suffix: "",
      color: "yellow",
      comment: null,
      status: "anchored",
    });
  });

  it("refuses broken JSON", () => {
    expect(() => parseAnnotations("{ not json")).toThrow(/not valid JSON/);
    expect(() => parseAnnotations("[]")).toThrow(/not a JSON object/);
  });

  it("refuses a file without a schema version", () => {
    expect(() => parseAnnotations(JSON.stringify({ highlights: [] }))).toThrow(/schemaVersion/);
  });

  it("refuses a newer schema version instead of overwriting it", () => {
    expect(() => parseAnnotations(JSON.stringify({ schemaVersion: 2, highlights: [] }))).toThrow(
      /schemaVersion 2/,
    );
  });

  it("ends the file with a newline", () => {
    expect(serializeAnnotations(emptyAnnotations("a.md")).endsWith("}\n")).toBe(true);
  });
});
