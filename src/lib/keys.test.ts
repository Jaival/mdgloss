// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { isTextEntry } from "./keys";

describe("isTextEntry", () => {
  it("is true for fields that take text", () => {
    expect(isTextEntry(document.createElement("input"))).toBe(true);
    expect(isTextEntry(document.createElement("textarea"))).toBe(true);
    expect(isTextEntry(document.createElement("select"))).toBe(true);
    const editable = document.createElement("div");
    editable.contentEditable = "true";
    expect(isTextEntry(editable)).toBe(true);
  });

  it("is false for everything else", () => {
    expect(isTextEntry(document.createElement("button"))).toBe(false);
    expect(isTextEntry(document.body)).toBe(false);
    expect(isTextEntry(window)).toBe(false);
    expect(isTextEntry(null)).toBe(false);
  });
});
