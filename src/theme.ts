import { useEffect, useState } from "react";

export type ThemeSetting = "system" | "light" | "dark" | "sepia";
export type Theme = Exclude<ThemeSetting, "system">;

export function isThemeSetting(value: string): value is ThemeSetting {
  return (ORDER as string[]).includes(value);
}

const STORAGE_KEY = "mdgloss.theme";
const ORDER: ThemeSetting[] = ["system", "light", "dark", "sepia"];
const DARK_QUERY = "(prefers-color-scheme: dark)";

/** The theme a setting shows. Only "system" depends on the OS. */
export function resolveTheme(setting: ThemeSetting, systemDark: boolean): Theme {
  return setting === "system" ? (systemDark ? "dark" : "light") : setting;
}

/** Sepia is a light theme: native controls and scrollbars stay light. */
export function colorScheme(theme: Theme): "light" | "dark" {
  return theme === "dark" ? "dark" : "light";
}

/** A stored setting, or "system" when nothing (or something unknown) is stored. */
export function parseSetting(stored: string | null): ThemeSetting {
  return stored !== null && isThemeSetting(stored) ? stored : "system";
}

/**
 * Light, dark, sepia or follow the OS. Puts a .dark or .sepia class on <html>, which swaps
 * the design tokens, and remembers the choice between sessions.
 */
export function useTheme() {
  const [setting, setSetting] = useState(() => parseSetting(localStorage.getItem(STORAGE_KEY)));
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(DARK_QUERY).matches);

  useEffect(() => {
    const query = window.matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const resolved = resolveTheme(setting, systemDark);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.classList.toggle("sepia", resolved === "sepia");
    root.style.colorScheme = colorScheme(resolved);
    localStorage.setItem(STORAGE_KEY, setting);
  }, [resolved, setting]);

  return { setting, setSetting };
}
