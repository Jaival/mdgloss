import type { SourceSelection } from "../selection/sourceSelection";
import { findQuote } from "./anchor";
import type { Highlight, HighlightColor } from "./types";

/** A highlight placed in the current source, ready to render. */
export interface PlacedHighlight {
  id: string;
  start: number;
  end: number;
  color: HighlightColor;
  /** Has a comment; gets a marker in the margin. */
  commented?: boolean;
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

/** The highlights of a source: placed ones in the order given, and those that couldn't be placed. */
export interface Placement {
  placed: PlacedHighlight[];
  /** Their text is gone or changed; listed in the notes panel, kept in the file. */
  orphaned: Highlight[];
}

/**
 * Finds where each highlight sits in `source` by exact re-anchoring (see
 * findQuote). The result isn't written back: the sidecar keeps the offset the
 * highlight was saved with, and a highlight that can't be placed stays in the
 * file untouched.
 */
export function placeHighlights(source: string, highlights: Highlight[]): Placement {
  const placement: Placement = { placed: [], orphaned: [] };
  for (const highlight of highlights) {
    const start = findQuote(source, highlight);
    if (start === null) {
      placement.orphaned.push(highlight);
      continue;
    }
    const placed: PlacedHighlight = {
      id: highlight.id,
      start,
      end: start + highlight.quote.length,
      color: highlight.color,
    };
    placement.placed.push(highlight.comment ? { ...placed, commented: true } : placed);
  }
  return placement;
}
