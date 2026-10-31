import type { AnnotationFile, Highlight } from "./types";

/**
 * Merges a sidecar that changed on disk while the app had it open (another
 * device synced it, `git pull`, a second window) with this window's change.
 * `base` is what this window's change started from, `ours` the change, and
 * `theirs` what is on disk now.
 *
 * By highlight id: additions and edits from both sides are kept, and a deletion
 * on either side is kept. When both sides edited a highlight, it is merged per
 * field: a field changed on one side only keeps that change, and a field
 * changed on both sides takes the value with the later `updated`. Fields this
 * build doesn't manage come from `theirs`, the newer copy.
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
    const [newer, older] = other.updated > mine.updated ? [other, mine] : [mine, other];
    // Both added the same id: nothing to merge against.
    if (!old) return [newer];
    return [mergeFields(old, newer, older)];
  });
  // Added on disk; a highlight in base but not in ours was deleted here.
  const added = theirs.highlights.filter((h) => !oursIds.has(h.id) && !baseById.has(h.id));

  return { ...theirs, highlights: [...merged, ...added] };
}

/** `newer` with every field that only `older` changed since `base`. */
function mergeFields(base: Highlight, newer: Highlight, older: Highlight): Highlight {
  const merged: Record<string, unknown> = { ...newer };
  const was: Record<string, unknown> = { ...base };
  for (const [field, value] of Object.entries(older)) {
    if (!equal(value, was[field]) && equal(merged[field], was[field])) merged[field] = value;
  }
  return merged as unknown as Highlight;
}

function byId(highlights: Highlight[]): Map<string, Highlight> {
  return new Map(highlights.map((h) => [h.id, h]));
}

function same(a: Highlight, b: Highlight | undefined): boolean {
  return b !== undefined && equal(a, b);
}

function equal(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
