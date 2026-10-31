import { describe, expect, it } from "vitest";
import { emptyAnnotations } from "./format";
import { mergeAnnotations } from "./merge";
import type { AnnotationFile, Highlight } from "./types";

function highlight(id: string, fields: Partial<Highlight> = {}): Highlight {
  return {
    id,
    quote: "process",
    prefix: "A ",
    suffix: " is",
    offset: 2,
    color: "yellow",
    comment: null,
    status: "anchored",
    created: "2026-10-20T10:00:00.000Z",
    updated: "2026-10-20T10:00:00.000Z",
    ...fields,
  };
}

function file(...highlights: Highlight[]): AnnotationFile {
  return { ...emptyAnnotations("a.md"), highlights };
}

const a = highlight("h_a");
const b = highlight("h_b");
const later = "2026-10-21T10:00:00.000Z";

describe("mergeAnnotations", () => {
  it("keeps additions from both sides", () => {
    const c = highlight("h_c");
    const merged = mergeAnnotations(file(a), file(a, b), file(a, c));
    expect(merged.highlights.map((h) => h.id)).toEqual(["h_a", "h_b", "h_c"]);
  });

  it("keeps a deletion made on either side", () => {
    expect(mergeAnnotations(file(a, b), file(b), file(a, b)).highlights).toEqual([b]);
    expect(mergeAnnotations(file(a, b), file(a, b), file(b)).highlights).toEqual([b]);
  });

  it("keeps a deletion even when the other side edited the highlight", () => {
    const edited = { ...a, color: "pink" as const, updated: later };
    expect(mergeAnnotations(file(a), file(), file(edited)).highlights).toEqual([]);
    expect(mergeAnnotations(file(a), file(edited), file()).highlights).toEqual([]);
  });

  it("keeps an edit made on either side", () => {
    const pink = { ...a, color: "pink" as const, updated: later };
    expect(mergeAnnotations(file(a), file(pink), file(a)).highlights).toEqual([pink]);
    expect(mergeAnnotations(file(a), file(a), file(pink)).highlights).toEqual([pink]);
  });

  it("lets the later edit win when both sides edited the same highlight", () => {
    const pink = { ...a, color: "pink" as const, updated: "2026-10-21T10:00:00.000Z" };
    const green = { ...a, color: "green" as const, updated: "2026-10-22T10:00:00.000Z" };
    expect(mergeAnnotations(file(a), file(pink), file(green)).highlights).toEqual([green]);
    expect(mergeAnnotations(file(a), file(green), file(pink)).highlights).toEqual([green]);
  });

  it("keeps a comment from one side and a colour change from the other", () => {
    const commented = { ...a, comment: "exam", updated: "2026-10-21T10:01:00.000Z" };
    const green = { ...a, color: "green" as const, updated: "2026-10-21T10:02:00.000Z" };
    const both = { ...a, comment: "exam", color: "green" as const, updated: green.updated };
    expect(mergeAnnotations(file(a), file(commented), file(green)).highlights).toEqual([both]);
    expect(mergeAnnotations(file(a), file(green), file(commented)).highlights).toEqual([both]);
  });

  it("lets the later comment win when both sides changed it", () => {
    const first = { ...a, comment: "first", updated: "2026-10-21T10:01:00.000Z" };
    const second = { ...a, comment: "second", updated: "2026-10-21T10:02:00.000Z" };
    expect(mergeAnnotations(file(a), file(first), file(second)).highlights).toEqual([second]);
    expect(mergeAnnotations(file(a), file(second), file(first)).highlights).toEqual([second]);
  });

  it("takes the later copy when both sides added the same id", () => {
    const pink = { ...a, color: "pink" as const, updated: later };
    expect(mergeAnnotations(file(), file(a), file(pink)).highlights).toEqual([pink]);
    expect(mergeAnnotations(file(), file(pink), file(a)).highlights).toEqual([pink]);
  });

  it("takes fields it doesn't manage from the copy on disk", () => {
    const theirs = { ...file(a), bookmarks: [{ id: "b_1" }] };
    const ours = { ...file(a, b), bookmarks: [] };
    expect(mergeAnnotations(file(a), ours, theirs)).toEqual({
      ...file(a, b),
      bookmarks: [{ id: "b_1" }],
    });
  });
});
