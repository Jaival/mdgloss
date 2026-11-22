export type FontRole = "mono" | "sans";

export interface FontOption {
  id: string;
  /** Shown in Settings. */
  name: string;
  /** The CSS font-family the files declare. */
  family: string;
  /** Imports the font's CSS. The defaults are imported at startup in main.tsx. */
  load: () => Promise<unknown>;
}

export interface FontSettings {
  mono: string;
  sans: string;
}

const loaded = () => Promise.resolve();

/** Editor font: code in the reader and the font-mono utility. */
export const MONO_FONTS: FontOption[] = [
  { id: "obel-mono", name: "Obel Mono", family: "Obel Mono", load: loaded },
  {
    id: "jetbrains-mono",
    name: "JetBrains Mono",
    family: "JetBrains Mono Variable",
    load: () =>
      Promise.all([
        import("@fontsource-variable/jetbrains-mono"),
        import("@fontsource-variable/jetbrains-mono/wght-italic.css"),
      ]),
  },
  {
    id: "geist-mono",
    name: "Geist Mono",
    family: "Geist Mono Variable",
    load: () =>
      Promise.all([
        import("@fontsource-variable/geist-mono"),
        import("@fontsource-variable/geist-mono/wght-italic.css"),
      ]),
  },
];

/** Interface font: the reader's text and headings, and the app's UI. */
export const SANS_FONTS: FontOption[] = [
  { id: "ibm-plex-sans", name: "IBM Plex Sans", family: "IBM Plex Sans Variable", load: loaded },
  {
    id: "geist",
    name: "Geist",
    family: "Geist Variable",
    load: () =>
      Promise.all([
        import("@fontsource-variable/geist"),
        import("@fontsource-variable/geist/wght-italic.css"),
      ]),
  },
  {
    id: "figtree",
    name: "Figtree",
    family: "Figtree Variable",
    load: () =>
      Promise.all([
        import("@fontsource-variable/figtree"),
        import("@fontsource-variable/figtree/wght-italic.css"),
      ]),
  },
  {
    id: "atkinson-hyperlegible-next",
    name: "Atkinson Hyperlegible Next",
    family: "Atkinson Hyperlegible Next Variable",
    load: () =>
      Promise.all([
        import("@fontsource-variable/atkinson-hyperlegible-next"),
        import("@fontsource-variable/atkinson-hyperlegible-next/wght-italic.css"),
      ]),
  },
  {
    id: "manrope",
    name: "Manrope",
    family: "Manrope Variable",
    load: () => import("@fontsource-variable/manrope"),
  },
  {
    id: "google-sans",
    name: "Google Sans",
    family: "Google Sans Variable",
    load: () =>
      Promise.all([
        import("@fontsource-variable/google-sans"),
        import("@fontsource-variable/google-sans/wght-italic.css"),
      ]),
  },
  {
    id: "google-sans-flex",
    name: "Google Sans Flex",
    family: "Google Sans Flex Variable",
    load: () => import("@fontsource-variable/google-sans-flex"),
  },
  {
    id: "space-grotesk",
    name: "Space Grotesk",
    family: "Space Grotesk Variable",
    load: () => import("@fontsource-variable/space-grotesk"),
  },
  {
    id: "instrument-sans",
    name: "Instrument Sans",
    family: "Instrument Sans Variable",
    load: () =>
      Promise.all([
        import("@fontsource-variable/instrument-sans"),
        import("@fontsource-variable/instrument-sans/wght-italic.css"),
      ]),
  },
  {
    id: "hanken-grotesk",
    name: "Hanken Grotesk",
    family: "Hanken Grotesk Variable",
    load: () =>
      Promise.all([
        import("@fontsource-variable/hanken-grotesk"),
        import("@fontsource-variable/hanken-grotesk/wght-italic.css"),
      ]),
  },
  {
    id: "onest",
    name: "Onest",
    family: "Onest Variable",
    load: () => import("@fontsource-variable/onest"),
  },
  {
    id: "dm-sans",
    name: "DM Sans",
    family: "DM Sans Variable",
    load: () =>
      Promise.all([
        import("@fontsource-variable/dm-sans"),
        import("@fontsource-variable/dm-sans/wght-italic.css"),
      ]),
  },
  {
    id: "public-sans",
    name: "Public Sans",
    family: "Public Sans Variable",
    load: () =>
      Promise.all([
        import("@fontsource-variable/public-sans"),
        import("@fontsource-variable/public-sans/wght-italic.css"),
      ]),
  },
];

export const FONTS: Record<FontRole, FontOption[]> = { mono: MONO_FONTS, sans: SANS_FONTS };

export const DEFAULT_FONTS: FontSettings = { mono: "obel-mono", sans: "ibm-plex-sans" };

const FALLBACKS: Record<FontRole, string> = {
  mono: "ui-monospace, Consolas, monospace",
  sans: '"Segoe UI", system-ui, sans-serif',
};

/** The option with this id, or the role's default for an unknown id. */
export function findFont(role: FontRole, id: string): FontOption {
  return FONTS[role].find((font) => font.id === id) ?? findFont(role, DEFAULT_FONTS[role]);
}

/** The value for --font-mono or --font-sans. */
export function fontStack(role: FontRole, font: FontOption): string {
  return `"${font.family}", ${FALLBACKS[role]}`;
}

/** Saved settings from storage; unknown or missing fonts become the defaults. */
export function parseFontSettings(raw: string | null): FontSettings {
  let saved: unknown = null;
  try {
    saved = raw === null ? null : JSON.parse(raw);
  } catch {
    // Not JSON: use the defaults.
  }
  const field = (role: FontRole) => {
    const id =
      typeof saved === "object" && saved !== null ? (saved as Record<string, unknown>)[role] : null;
    return typeof id === "string" && FONTS[role].some((font) => font.id === id)
      ? id
      : DEFAULT_FONTS[role];
  };
  return { mono: field("mono"), sans: field("sans") };
}
