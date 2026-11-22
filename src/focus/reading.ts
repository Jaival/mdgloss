import type { HighlightColor } from "../annotations/types";

/** Average silent reading speed for non-fiction, in words per minute. */
export const WORDS_PER_MINUTE = 230;

/** Words in a markdown source. Markup characters on their own don't count. */
export function countWords(source: string): number {
  return source.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

/**
 * How far the reader has scrolled, from 0 at the top to 1 at the bottom. A
 * document that fits without scrolling is read in full.
 */
export function readingProgress(scrollTop: number, scrollHeight: number, clientHeight: number) {
  const range = scrollHeight - clientHeight;
  if (range <= 0) return 1;
  return Math.min(1, Math.max(0, scrollTop / range));
}

/** Whole minutes to read what is left; 0 only once nothing is left. */
export function minutesLeft(words: number, progress: number): number {
  return Math.ceil((words * (1 - progress)) / WORDS_PER_MINUTE);
}

/** The progress pill's text, like "38% · 6 min left". */
export function progressLabel(words: number, progress: number): string {
  const percent = Math.round(progress * 100);
  const minutes = minutesLeft(words, progress);
  return minutes === 0 ? `${percent}% · done` : `${percent}% · ${minutes} min left`;
}

export interface TickInput {
  id: string;
  color: HighlightColor;
  /** The highlight's first line, in px from the top of the scrolled content. */
  top: number;
}

export interface Tick {
  id: string;
  color: HighlightColor;
  /** From 0 (the top of the document) to 1 (the bottom). */
  at: number;
}

/** Where each highlight's tick sits on the right-edge track, as a share of the document's height. */
export function tickPositions(items: readonly TickInput[], height: number): Tick[] {
  if (height <= 0) return [];
  return items.map(({ id, color, top }) => ({
    id,
    color,
    at: Math.min(1, Math.max(0, top / height)),
  }));
}
