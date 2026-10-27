import type { AnnotationFile, Highlight } from "./types";

/**
 * Merges a sidecar that changed on disk while the app had it open (another
 * device synced it, `git pull`, a second window) with this window's change.
 * `base` is what this window's change started from, `ours` the change, and
 * `theirs` what is on disk now.
 *
 * By highlight id: additions and edits from both sides are kept, a deletion on
 * either side is kept, and when both sides edited a highlight the later
 * `updated` wins. Fields this build doesn't manage come from `theirs`, the
 * newer copy.
 */
export function mergeAnnotations(
  base: AnnotationFile,
  ours: AnnotationFile,
  theirs: AnnotationFile,
): AnnotationFile {
  const baseById = byId(base.highlights);
  const theirsById = byId(theirs.highlights);
  const oursIds = new Set(ours.highlights.map((h) => h.id));

  const merged = ours.highlights.flatMap((mine) => {
    const old = baseById.get(mine.id);
    const other = theirsById.get(mine.id);
    // Deleted on disk.
    if (old && !other) return [];
    if (!other || same(other, old)) return [mine];
    if (same(mine, old)) return [other];
    // Both sides edited it, or both added the same id.
    return [other.updated > mine.updated ? other : mine];
  });
  // Added on disk; a highlight in base but not in ours was deleted here.
  const added = theirs.highlights.filter((h) => !oursIds.has(h.id) && !baseById.has(h.id));

  return { ...theirs, highlights: [...merged, ...added] };
}

function byId(highlights: Highlight[]): Map<string, Highlight> {
  return new Map(highlights.map((h) => [h.id, h]));
}

function same(a: Highlight, b: Highlight | undefined): boolean {
  return b !== undefined && JSON.stringify(a) === JSON.stringify(b);
}
