import { describe, expect, it } from "vitest";
import { colorScheme, isThemeSetting, parseSetting, resolveTheme } from "./theme";

describe("resolveTheme", () => {
  it("follows the OS only for the system setting", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("sepia", true)).toBe("sepia");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});

describe("colorScheme", () => {
  it("treats sepia as a light theme", () => {
    expect(colorScheme("sepia")).toBe("light");
    expect(colorScheme("light")).toBe("light");
    expect(colorScheme("dark")).toBe("dark");
  });
});

describe("parseSetting", () => {
  it("keeps known settings and falls back to system", () => {
    expect(parseSetting("sepia")).toBe("sepia");
    expect(parseSetting("dark")).toBe("dark");
    expect(parseSetting(null)).toBe("system");
    expect(parseSetting("solarized")).toBe("system");
  });

  it("agrees with isThemeSetting", () => {
    expect(isThemeSetting("sepia")).toBe(true);
    expect(isThemeSetting("Sepia")).toBe(false);
  });
});
