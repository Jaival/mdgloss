import { describe, expect, it } from "vitest";
import { parseMode } from "./mode";

describe("parseMode", () => {
  it("reads a stored mode", () => {
    expect(parseMode("focus")).toBe("focus");
    expect(parseMode("annotate")).toBe("annotate");
  });

  it("starts in annotate mode when nothing, or something unknown, is stored", () => {
    expect(parseMode(null)).toBe("annotate");
    expect(parseMode("zen")).toBe("annotate");
  });
});
