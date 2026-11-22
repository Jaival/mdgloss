// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { isPaletteShortcut, isTextEntry } from "./keys";

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

describe("isPaletteShortcut", () => {
  const key = (init: KeyboardEventInit) => new KeyboardEvent("keydown", init);

  it("is true for Ctrl+K and Cmd+K", () => {
    expect(isPaletteShortcut(key({ key: "k", ctrlKey: true }))).toBe(true);
    expect(isPaletteShortcut(key({ key: "K", metaKey: true }))).toBe(true);
  });

  it("is false for K alone or with other modifiers", () => {
    expect(isPaletteShortcut(key({ key: "k" }))).toBe(false);
    expect(isPaletteShortcut(key({ key: "k", ctrlKey: true, shiftKey: true }))).toBe(false);
    expect(isPaletteShortcut(key({ key: "k", ctrlKey: true, altKey: true }))).toBe(false);
    expect(isPaletteShortcut(key({ key: "j", ctrlKey: true }))).toBe(false);
  });
});
