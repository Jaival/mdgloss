import type { HighlightColor } from "./types";

/** Tailwind classes that fill a swatch or dot with a highlight's colour. */
export const HIGHLIGHT_FILL: Record<HighlightColor, string> = {
  yellow: "bg-highlight-yellow",
  green: "bg-highlight-green",
  pink: "bg-highlight-pink",
  purple: "bg-highlight-purple",
};

/** Tailwind classes for a left border in a highlight's colour (card quotes, margin cards). */
export const HIGHLIGHT_BORDER: Record<HighlightColor, string> = {
  yellow: "border-l-highlight-yellow",
  green: "border-l-highlight-green",
  pink: "border-l-highlight-pink",
  purple: "border-l-highlight-purple",
};
