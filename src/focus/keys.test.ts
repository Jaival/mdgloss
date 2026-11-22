import { describe, expect, it } from "vitest";
import { focusKeyAction, type FocusKey, type FocusKeyState } from "./keys";

const key = (k: string, extra: Partial<FocusKey> = {}): FocusKey => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  repeat: false,
  defaultPrevented: false,
  textEntry: false,
  ...extra,
});

const focus: FocusKeyState = { focus: true, overlayOpen: false, hasDocument: true };
const annotate: FocusKeyState = { ...focus, focus: false };

describe("focusKeyAction", () => {
  it("switches the mode on Ctrl+. or Cmd+. in either mode", () => {
    expect(focusKeyAction(key(".", { ctrlKey: true }), annotate)).toBe("toggle");
    expect(focusKeyAction(key(".", { metaKey: true }), focus)).toBe("toggle");
    expect(focusKeyAction(key(".", { ctrlKey: true }), { ...annotate, hasDocument: false })).toBe(
      "toggle",
    );
  });

  it("ignores . with other modifiers or none", () => {
    expect(focusKeyAction(key("."), focus)).toBeNull();
    expect(focusKeyAction(key(".", { ctrlKey: true, shiftKey: true }), focus)).toBeNull();
    expect(focusKeyAction(key(".", { ctrlKey: true, altKey: true }), focus)).toBeNull();
  });

  it("leaves focus mode on Esc when nothing else is open", () => {
    expect(focusKeyAction(key("Escape"), focus)).toBe("leave");
    expect(focusKeyAction(key("Escape"), annotate)).toBeNull();
  });

  it("lets Esc close an open palette, popover, sheet, dialog or toolbar first", () => {
    expect(focusKeyAction(key("Escape"), { ...focus, overlayOpen: true })).toBeNull();
    expect(focusKeyAction(key("Escape", { defaultPrevented: true }), focus)).toBeNull();
  });

  it("opens the notes on N in focus mode with a document", () => {
    expect(focusKeyAction(key("n"), focus)).toBe("notes");
    expect(focusKeyAction(key("N", { shiftKey: true }), focus)).toBe("notes");
    expect(focusKeyAction(key("n"), annotate)).toBeNull();
    expect(focusKeyAction(key("n"), { ...focus, hasDocument: false })).toBeNull();
    expect(focusKeyAction(key("n", { ctrlKey: true }), focus)).toBeNull();
  });

  it("leaves keys typed into a field, repeats and keys under an overlay alone", () => {
    expect(focusKeyAction(key("Escape", { textEntry: true }), focus)).toBeNull();
    expect(focusKeyAction(key("n", { textEntry: true }), focus)).toBeNull();
    expect(focusKeyAction(key(".", { ctrlKey: true, textEntry: true }), focus)).toBeNull();
    expect(focusKeyAction(key(".", { ctrlKey: true, repeat: true }), focus)).toBeNull();
    expect(focusKeyAction(key(".", { ctrlKey: true }), { ...focus, overlayOpen: true })).toBeNull();
    expect(focusKeyAction(key("n"), { ...focus, overlayOpen: true })).toBeNull();
  });
});
