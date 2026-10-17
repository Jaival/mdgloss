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
    expect(placeHighlights(source, [createHighlight(selection, "green")])).toMatchObject([
      { start: 2, end: 9, color: "green" },
    ]);
  });

  it("skips a highlight whose text has moved, until re-anchoring exists", () => {
    const moved = { ...createHighlight(selection, "green"), offset: 3 };
    expect(placeHighlights(source, [moved])).toEqual([]);
    expect(placeHighlights("short", [createHighlight(selection, "green")])).toEqual([]);
  });
});
