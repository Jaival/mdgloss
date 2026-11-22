import { useEffect, useState } from "react";
import {
  DEFAULT_FONTS,
  findFont,
  fontStack,
  parseFontSettings,
  type FontOption,
  type FontRole,
  type FontSettings,
} from "./catalog";

const STORAGE_KEY = "mdgloss.fonts";
const ROLES: FontRole[] = ["mono", "sans"];

/** Imports the font's CSS and checks that its files load. */
export async function loadFont(font: FontOption): Promise<boolean> {
  try {
    await font.load();
    const faces = await document.fonts.load(`1em "${font.family}"`);
    return faces.length > 0;
  } catch {
    return false;
  }
}

/**
 * The editor (mono) and interface (sans) fonts. Loads the chosen ones, sets
 * --font-mono and --font-sans on <html>, and remembers the choice between
 * sessions. A font that fails to load is replaced by the role's default.
 */
export function useFonts() {
  const [fonts, setFonts] = useState<FontSettings>(() =>
    parseFontSettings(localStorage.getItem(STORAGE_KEY)),
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fonts));
    let cancelled = false;
    for (const role of ROLES) {
      const font = findFont(role, fonts[role]);
      void loadFont(font).then((ok) => {
        if (cancelled) return;
        if (ok || font.id === DEFAULT_FONTS[role]) {
          document.documentElement.style.setProperty(`--font-${role}`, fontStack(role, font));
        } else {
          setFonts((current) => ({ ...current, [role]: DEFAULT_FONTS[role] }));
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, [fonts]);

  const setFont = (role: FontRole, id: string) =>
    setFonts((current) => ({ ...current, [role]: id }));

  return { fonts, setFont };
}
