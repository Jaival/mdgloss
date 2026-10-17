import type { SourceSelection } from "../selection/sourceSelection";
import type { Highlight, HighlightColor } from "./types";

/** A highlight placed in the current source, ready to render. */
export interface PlacedHighlight {
  id: string;
  start: number;
  end: number;
  color: HighlightColor;
  /** Being edited in the toolbar; rendered with an outline. */
  active?: boolean;
}

export function createHighlight(
  selection: SourceSelection,
  color: HighlightColor,
  now = new Date(),
): Highlight {
  const timestamp = now.toISOString();
  return {
    id: `h_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
    quote: selection.quote,
    prefix: selection.prefix,
    suffix: selection.suffix,
    offset: selection.start,
    color,
    comment: null,
    status: "anchored",
    created: timestamp,
    updated: timestamp,
  };
}

/**
 * Finds where each highlight sits in `source`. For now a highlight is placed
 * only if its quote is still at the stored offset. Re-anchoring moved text
 * comes in week 6; until then a highlight that doesn't match isn't shown,
 * and it stays in the file untouched.
 */
export function placeHighlights(source: string, highlights: Highlight[]): PlacedHighlight[] {
  return highlights.flatMap((highlight) => {
    const start = highlight.offset;
    const end = start + highlight.quote.length;
    if (source.slice(start, end) !== highlight.quote) return [];
    return [{ id: highlight.id, start, end, color: highlight.color }];
  });
}
