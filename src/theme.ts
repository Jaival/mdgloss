import { useEffect, useState } from "react";

export type ThemeSetting = "system" | "light" | "dark";

export function isThemeSetting(value: string): value is ThemeSetting {
  return (ORDER as string[]).includes(value);
}

const STORAGE_KEY = "mdgloss.theme";
const ORDER: ThemeSetting[] = ["system", "light", "dark"];
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

function loadSetting(): ThemeSetting {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored !== null && isThemeSetting(stored) ? stored : "system";
}

/**
 * Light, dark or follow the OS. Toggles the .dark class on <html>, which swaps the
 * design tokens, and remembers the choice between sessions.
 */
export function useTheme() {
  const [setting, setSetting] = useState<ThemeSetting>(loadSetting);
  const [systemDark, setSystemDark] = useState(darkQuery.matches);

  useEffect(() => {
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    darkQuery.addEventListener("change", onChange);
    return () => darkQuery.removeEventListener("change", onChange);
  }, []);

  const resolved = setting === "system" ? (systemDark ? "dark" : "light") : setting;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.style.colorScheme = resolved;
    localStorage.setItem(STORAGE_KEY, setting);
  }, [resolved, setting]);

  return { setting, setSetting };
}
