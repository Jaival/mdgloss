import { describe, expect, it } from "vitest";
import { createHighlight, placeHighlights } from "./highlights";

const source = "A process is a program in execution.\n";
const selection = { start: 2, end: 9, quote: "process", prefix: "A ", suffix: " is a program" };

describe("createHighlight", () => {
  it("stores the selection against the source", () => {
    const now = new Date("2026-10-20T14:02:00Z");
    const highlight = createHighlight(selection, "yellow", now);
    expect(highlight).toMatchObject({
      quote: "process",
      prefix: "A ",
      suffix: " is a program",
      offset: 2,
      color: "yellow",
      comment: null,
      status: "anchored",
      created: "2026-10-20T14:02:00.000Z",
      updated: "2026-10-20T14:02:00.000Z",
    });
    expect(highlight.id).toMatch(/^h_[0-9a-f]{12}$/);
  });

  it("gives every highlight its own id", () => {
    expect(createHighlight(selection, "yellow").id).not.toBe(
      createHighlight(selection, "yellow").id,
    );
  });
});

describe("placeHighlights", () => {
  it("places a highlight whose quote is at its offset", () => {
    expect(placeHighlights(source, [createHighlight(selection, "green")])).toMatchObject({
      placed: [{ start: 2, end: 9, color: "green" }],
      orphaned: [],
    });
  });

  it("flags a highlight with a comment", () => {
    const plain = createHighlight(selection, "green");
    const { placed } = placeHighlights(source, [{ ...plain, comment: "exam" }, plain]);
    expect(placed[0].commented).toBe(true);
    expect(placed[1].commented).toBeUndefined();
  });

  it("follows a quote that moved", () => {
    const highlight = createHighlight(selection, "green");
    const { placed } = placeHighlights(`Intro.\n\n${source}`, [highlight]);
    expect(placed).toMatchObject([{ id: highlight.id, start: 10, end: 17 }]);
  });

  it("orphans a highlight whose quote is gone, and keeps it unchanged", () => {
    const highlight = createHighlight(selection, "green");
    expect(placeHighlights("A program in execution.\n", [highlight])).toEqual({
      placed: [],
      orphaned: [highlight],
    });
  });
});
