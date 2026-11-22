import { describe, expect, it } from "vitest";
import { layoutMargin } from "./layout";

describe("layoutMargin", () => {
  it("returns nothing for no items", () => {
    expect(layoutMargin([], 8)).toEqual([]);
  });

  it("puts boxes that fit level with their anchors", () => {
    const items = [
      { anchor: 0, height: 40 },
      { anchor: 100, height: 40 },
      { anchor: 300, height: 60 },
    ];
    expect(layoutMargin(items, 8)).toEqual([0, 100, 300]);
  });

  it("pushes an overlapping box down below the one above, with the gap", () => {
    const items = [
      { anchor: 10, height: 50 },
      { anchor: 30, height: 20 },
    ];
    expect(layoutMargin(items, 8)).toEqual([10, 68]);
  });

  it("carries a push down a chain of boxes", () => {
    const items = [
      { anchor: 0, height: 100 },
      { anchor: 20, height: 30 },
      { anchor: 40, height: 30 },
      { anchor: 500, height: 30 },
    ];
    expect(layoutMargin(items, 10)).toEqual([0, 110, 150, 500]);
  });

  it("lets a box touch the one above when they meet exactly", () => {
    const items = [
      { anchor: 0, height: 20 },
      { anchor: 24, height: 20 },
    ];
    expect(layoutMargin(items, 4)).toEqual([0, 24]);
  });

  it("stacks by anchor and returns tops in input order", () => {
    const items = [
      { anchor: 200, height: 30 },
      { anchor: 0, height: 210 },
    ];
    expect(layoutMargin(items, 8)).toEqual([218, 0]);
  });

  it("keeps input order for level anchors", () => {
    const items = [
      { anchor: 50, height: 20 },
      { anchor: 50, height: 20 },
      { anchor: 50, height: 20 },
    ];
    expect(layoutMargin(items, 5)).toEqual([50, 75, 100]);
  });

  it("allows negative anchors (a mark above the margin's top)", () => {
    expect(layoutMargin([{ anchor: -12, height: 10 }], 4)).toEqual([-12]);
  });
});
