# Spike: comment popover data path

Sprint 2026-10-26, P2 stretch. Input for week 5 (comments and sidebar). Done 27 Oct.

Question: what does it take to get a comment from a popover on a highlight into the sidecar, and what breaks on the way?

## The path today

1. The `comment` field already exists on `Highlight` (`string | null`, see [`types.ts`](../../src/annotations/types.ts)) and `createHighlight` sets it to `null`. No format change is needed.
2. Writing one is a call to `useAnnotations().update`, the same as a colour change in `App.tsx`: map the highlight, set `comment` and `updated`. Each `update` queues one save, and each save re-reads the sidecar, merges, writes `<name>.json.tmp` and renames it.
3. The merged file comes back into `annotations.highlights`, so a comment from another window shows after the next save.

So the data path is in place. Four things break when a text field is put on top of it.

## Findings

### 1. A comment and a colour change from two windows: one is lost (confirmed)

`mergeAnnotations` merges whole highlights. When both sides changed the same highlight, the later `updated` wins, all fields together. A throwaway test confirmed it: window A adds the comment "exam" at 10:01, window B turns the same highlight green at 10:02, and the merged highlight is green with `comment: null`.

Colour-only edits never hit this in practice, but a comment takes a minute to type, so the window for a conflict is much wider.

**Fix (week 5):** merge per field. For each field, take ours if ours differs from base, otherwise theirs; when both changed the same field, the later `updated` wins for that field. About 10 lines in `merge.ts` plus two tests (comment vs colour kept, comment vs comment later wins). Same-field conflicts still lose one side, which the SPEC already accepts.

### 2. Typing in the popover would trigger toolbar shortcuts

`HighlightToolbar` listens to `keydown` on `window` and doesn't check the target. In a comment textarea, typing `1`–`4` would recolour the highlight and Backspace would delete it.

**Fix:** return early when `event.target` is an `input`, `textarea` or `contenteditable`, or only listen while focus is outside the comment field.

### 3. The toolbar can't hold a text field

The toolbar calls `preventDefault` on `mousedown` to keep the text selection. That also stops a textarea inside it from taking focus on click.

**Fix:** the comment editor is its own element (shadcn `Popover` with a `Textarea`), opened from a comment button on the toolbar or `C`, as DESIGN.md section 8 describes. The toolbar keeps its `mousedown` handler.

### 4. Save once per comment, not per keystroke

Each save is a read, a merge and two writes. Saving on every keystroke would queue dozens of them, and each would bump `updated`, which makes finding 1 more likely to pick the wrong side.

**Fix:** keep the draft in the popover's state. Save on `Ctrl/Cmd+Enter`, on blur and on close; `Esc` discards. A comment that is empty after trimming is saved as `null`.

## Decisions for week 5

- **Comment on a new selection** (toolbar → comment button before picking a colour): create the highlight in yellow and the comment in one `update` when the comment is saved. If the popover is discarded, nothing is created. One save, and no stray highlight.
- **Margin marker** (DESIGN.md: "a highlight with a comment also gets a small marker"): add `hasComment` to `PlacedHighlight` in `placeHighlights`. The renderer change is separate from the data path.
- **Anchor position:** the toolbar's `anchor` is a `DOMRect` taken on click, and the reader doesn't close it on scroll. A popover the user types into stays open longer, so either close it on scroll (saving the draft) or use the shadcn `Popover` anchored to the `mark` element. Decide when building; the `Popover` route is less code.

## Not tested

- A sidecar changing on disk while the popover is open. With save-on-close, the merge at that save covers it; there is nothing to show until file watching (week 6).
- Performance of the save queue under fast edits. With finding 4 applied, a comment is one save.
