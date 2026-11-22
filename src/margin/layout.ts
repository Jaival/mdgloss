/** One box in the margin: where its highlight starts, and how tall the box is. */
export interface MarginItem {
  /** The top of the highlight's first mark, relative to the margin. */
  anchor: number;
  height: number;
}

/**
 * Places margin boxes (comment cards, dots) beside their highlights. Each box
 * starts level with its anchor and is pushed down when it would overlap the box
 * above it, keeping `gap` between them. Boxes stack in anchor order (document
 * order when two anchors are level); the result is in input order.
 */
export function layoutMargin(items: readonly MarginItem[], gap: number): number[] {
  const order = items.map((_, i) => i).sort((a, b) => items[a].anchor - items[b].anchor || a - b);
  const tops = new Array<number>(items.length);
  let free = -Infinity;
  for (const i of order) {
    const top = Math.max(items[i].anchor, free);
    tops[i] = top;
    free = top + items[i].height + gap;
  }
  return tops;
}
