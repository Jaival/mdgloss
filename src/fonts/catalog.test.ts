import { describe, expect, it } from "vitest";
import {
  DEFAULT_FONTS,
  FONTS,
  findFont,
  fontStack,
  MONO_FONTS,
  parseFontSettings,
  SANS_FONTS,
} from "./catalog";

describe("parseFontSettings", () => {
  it("uses the defaults when nothing is saved", () => {
    expect(parseFontSettings(null)).toEqual(DEFAULT_FONTS);
  });

  it("restores saved fonts", () => {
    expect(parseFontSettings('{"mono":"geist-mono","sans":"dm-sans"}')).toEqual({
      mono: "geist-mono",
      sans: "dm-sans",
    });
  });

  it("replaces unknown, wrong-role or missing fonts with the defaults", () => {
    expect(parseFontSettings('{"mono":"dm-sans","sans":"gone"}')).toEqual(DEFAULT_FONTS);
    expect(parseFontSettings('{"sans":"geist"}')).toEqual({ ...DEFAULT_FONTS, sans: "geist" });
    expect(parseFontSettings('{"mono":3}')).toEqual(DEFAULT_FONTS);
  });

  it("ignores storage that isn't a JSON object", () => {
    expect(parseFontSettings("not json")).toEqual(DEFAULT_FONTS);
    expect(parseFontSettings("null")).toEqual(DEFAULT_FONTS);
    expect(parseFontSettings('"geist"')).toEqual(DEFAULT_FONTS);
  });
});

describe("findFont", () => {
  it("finds a font by id and falls back to the default", () => {
    expect(findFont("sans", "onest").family).toBe("Onest Variable");
    expect(findFont("mono", "nope").id).toBe(DEFAULT_FONTS.mono);
  });
});

describe("fontStack", () => {
  it("puts the chosen family before the system fallbacks", () => {
    expect(fontStack("mono", MONO_FONTS[0])).toBe('"Obel Mono", ui-monospace, Consolas, monospace');
    expect(fontStack("sans", SANS_FONTS[0])).toBe(
      '"IBM Plex Sans Variable", "Segoe UI", system-ui, sans-serif',
    );
  });
});

describe("catalog", () => {
  it("lists the defaults first and has unique ids", () => {
    for (const role of ["mono", "sans"] as const) {
      expect(FONTS[role][0].id).toBe(DEFAULT_FONTS[role]);
      const ids = FONTS[role].map((font) => font.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
    expect(MONO_FONTS).toHaveLength(3);
    expect(SANS_FONTS).toHaveLength(13);
  });
});
