import type { Highlight } from "./types";

/** How far from the stored offset, in characters, step 1 looks for the quote in its context. */
export const NEAR = 1000;

type Anchor = Pick<Highlight, "quote" | "prefix" | "suffix" | "offset">;

/**
 * Finds where a highlight's quote starts in `source`, by exact matching
 * (steps 1 and 2 of re-anchoring, docs/SPEC.md#re-anchoring). Returns null when
 * neither step places it; the highlight is then orphaned.
 *
 * 1. `prefix + quote + suffix` within NEAR characters of the stored offset; the
 *    nearest one wins.
 * 2. The quote anywhere in the file. One match is taken as it is. Between
 *    repeats, the one whose surroundings agree most with the prefix and suffix
 *    wins, and the nearest one breaks a tie. Repeats with no agreeing context
 *    at all aren't guessed between.
 */
export function findQuote(
  source: string,
  { quote, prefix, suffix, offset }: Anchor,
): number | null {
  if (quote === "") return null;

  // Step 1.
  const context = prefix + quote + suffix;
  const from = Math.max(0, offset - prefix.length - NEAR);
  const to = Math.min(source.length, offset + quote.length + suffix.length + NEAR);
  let best: number | null = null;
  for (let at = source.indexOf(context, from); at !== -1 && at + context.length <= to;) {
    const start = at + prefix.length;
    if (best === null || Math.abs(start - offset) < Math.abs(best - offset)) best = start;
    at = source.indexOf(context, at + 1);
  }
  if (best !== null) return best;

  // Step 2.
  const starts: number[] = [];
  for (let at = source.indexOf(quote); at !== -1; at = source.indexOf(quote, at + 1)) {
    starts.push(at);
  }
  if (starts.length <= 1) return starts[0] ?? null;

  let bestScore = 0;
  for (const start of starts) {
    const score =
      commonSuffix(source.slice(Math.max(0, start - prefix.length), start), prefix) +
      commonPrefix(
        source.slice(start + quote.length, start + quote.length + suffix.length),
        suffix,
      );
    const nearer = best !== null && Math.abs(start - offset) < Math.abs(best - offset);
    if (score > bestScore || (score === bestScore && score > 0 && nearer)) {
      best = start;
      bestScore = score;
    }
  }
  return best;
}

function commonPrefix(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  return n;
}

function commonSuffix(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++;
  return n;
}
