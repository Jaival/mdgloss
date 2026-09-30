import { describe, expect, it } from "vitest";
import { sidecarPath } from "./sidecar";

describe("sidecarPath", () => {
  it("puts the sidecar next to a nested file", () => {
    expect(sidecarPath("notes/week1.md")).toBe("notes/.mdgloss/week1.md.json");
  });

  it("handles a file in the root folder", () => {
    expect(sidecarPath("README.md")).toBe(".mdgloss/README.md.json");
  });

  it("normalizes Windows separators", () => {
    expect(sidecarPath("C:\\docs\\os\\week3.md")).toBe("C:/docs/os/.mdgloss/week3.md.json");
  });

  it("rejects a folder path", () => {
    expect(() => sidecarPath("notes/")).toThrow();
  });
});
