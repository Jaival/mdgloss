import { useEffect, useState } from "react";

export type ThemeSetting = "system" | "light" | "dark";

const STORAGE_KEY = "mdgloss.theme";
const ORDER: ThemeSetting[] = ["system", "light", "dark"];
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

function loadSetting(): ThemeSetting {
  const stored = localStorage.getItem(STORAGE_KEY);
  return ORDER.includes(stored as ThemeSetting) ? (stored as ThemeSetting) : "system";
}

/**
 * Light, dark or follow the OS. Sets data-theme="light|dark" on <html>, which the
 * stylesheets key off, and remembers the choice between sessions.
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
    document.documentElement.dataset.theme = resolved;
    localStorage.setItem(STORAGE_KEY, setting);
  }, [resolved, setting]);

  const cycle = () => setSetting(ORDER[(ORDER.indexOf(setting) + 1) % ORDER.length]);

  return { setting, cycle };
}
