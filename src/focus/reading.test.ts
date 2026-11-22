import { describe, expect, it } from "vitest";
import {
  WORDS_PER_MINUTE,
  countWords,
  minutesLeft,
  progressLabel,
  readingProgress,
  tickPositions,
} from "./reading";

describe("countWords", () => {
  it("counts words, not markup", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("# Why spacing works\n\n- one\n- two **three**")).toBe(6);
    expect(countWords("don't re-read it — twice")).toBe(4);
    expect(countWords("Ünïcode wörds 42")).toBe(3);
  });
});

describe("readingProgress", () => {
  it("goes from 0 at the top to 1 at the bottom", () => {
    expect(readingProgress(0, 1000, 400)).toBe(0);
    expect(readingProgress(300, 1000, 400)).toBe(0.5);
    expect(readingProgress(600, 1000, 400)).toBe(1);
  });

  it("clamps overscroll", () => {
    expect(readingProgress(-20, 1000, 400)).toBe(0);
    expect(readingProgress(700, 1000, 400)).toBe(1);
  });

  it("counts a document that fits as read", () => {
    expect(readingProgress(0, 400, 400)).toBe(1);
    expect(readingProgress(0, 300, 400)).toBe(1);
  });
});

describe("minutesLeft", () => {
  it("rounds up what is left", () => {
    expect(minutesLeft(WORDS_PER_MINUTE * 10, 0)).toBe(10);
    expect(minutesLeft(WORDS_PER_MINUTE * 10, 0.38)).toBe(7);
    expect(minutesLeft(10, 0.99)).toBe(1);
  });

  it("is 0 only when nothing is left", () => {
    expect(minutesLeft(5000, 1)).toBe(0);
    expect(minutesLeft(0, 0)).toBe(0);
  });
});

describe("progressLabel", () => {
  it("shows the percent and the minutes left", () => {
    expect(progressLabel(WORDS_PER_MINUTE * 10, 0.38)).toBe("38% · 7 min left");
    expect(progressLabel(WORDS_PER_MINUTE * 10, 0)).toBe("0% · 10 min left");
  });

  it("says done at the end", () => {
    expect(progressLabel(1000, 1)).toBe("100% · done");
  });
});

describe("tickPositions", () => {
  it("places each tick as a share of the document's height", () => {
    const ticks = tickPositions(
      [
        { id: "a", color: "yellow", top: 0 },
        { id: "b", color: "green", top: 250 },
        { id: "c", color: "pink", top: 1000 },
      ],
      1000,
    );
    expect(ticks).toEqual([
      { id: "a", color: "yellow", at: 0 },
      { id: "b", color: "green", at: 0.25 },
      { id: "c", color: "pink", at: 1 },
    ]);
  });

  it("keeps ticks on the track", () => {
    const ticks = tickPositions(
      [
        { id: "a", color: "yellow", top: -10 },
        { id: "b", color: "purple", top: 1200 },
      ],
      1000,
    );
    expect(ticks.map((t) => t.at)).toEqual([0, 1]);
  });

  it("returns nothing for a document with no height", () => {
    expect(tickPositions([{ id: "a", color: "yellow", top: 0 }], 0)).toEqual([]);
  });
});
