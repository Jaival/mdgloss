# Handoff

Sprint 2026-11-02 (spec week 5): comments and sidebar. Branch `sprint-5`; each step is its own PR into `sprint-5`, stacked in order, and `sprint-5` merges into `main` when the week is done.

## Done (PRs open, 31 Oct)

Merge in this order. After each merge the next PR's diff shrinks to its own commit.

1. [#42](https://github.com/Jaival/mdgloss/pull/42) **Per-field merge** in [`merge.ts`](src/annotations/merge.ts). Spike finding 1: a comment in one window and a colour change in another on the same highlight now both survive. Same-field conflicts still go to the later `updated`.
2. [#43](https://github.com/Jaival/mdgloss/pull/43) **Toolbar ignores keys typed in a text field** ([`keys.ts`](src/lib/keys.ts)). Spike finding 2.
3. [#44](https://github.com/Jaival/mdgloss/pull/44) **Comment popover** ([`CommentPopover.tsx`](src/annotations/CommentPopover.tsx)). Toolbar button or `C`. Anchored to the `<mark>` or the selection `Range`, so it follows the text on scroll. Saves once on `Ctrl/Cmd+Enter`, click outside or blur; `Esc` discards. A comment on a new selection creates a yellow highlight in one save.
4. [#45](https://github.com/Jaival/mdgloss/pull/45) **Margin marker** for commented highlights: `data-comment` on the first mark, a CSS `MessageSquare` in the right margin.
5. Notes panel PR (this branch, `feat/notes-panel`): [`NotesPanel.tsx`](src/annotations/NotesPanel.tsx), toggled from the header. Cards in document order; click scrolls and pulses; menu edits the comment or deletes.

All five pass format, lint, typecheck, tests (141) and build locally. None touch Rust.

## Not checked in the app

There are no component tests and the reader needs Tauri to open a file, so every UI step above is unchecked by hand. Run `bun tauri dev` on `docs/release-check/` and go through the checks listed in #44, #45 and the notes panel PR before merging `sprint-5` into `main`.

## Next (sprint order)

1. P0 (you) Click through #44, #45 and the notes panel in `bun tauri dev`, then merge the five PRs into `sprint-5` in order.
2. P1 (you) Run the release checklist on a Mac (week 5 "done when"): single file and folder, `.mdgloss` grant, selections across formatting. Record the Gatekeeper text and whether the universal build opens on Apple Silicon, then fix `.github/release-header.md`.
3. Still open from week 4: first dogfooding session on Windows, and the trademark check (`notes/trademark-check.md`).
4. Merge `sprint-5` into `main`, update the week 5 row in SPEC.md, tag v0.0.5 so the dogfooding log can use a release with #36.

## Open decisions and checks

- **Left out of the notes panel, from DESIGN.md:** opening it on the first annotation (it opens only from the header button), and the `Sheet` below ~900px window width. Both are small; decide after daily use.
- **The card quote is the raw source text**, so `**bold**` shows its asterisks. Showing the rendered text needs the marks' DOM text or a markdown-to-text pass. Decide after daily use.
- **Popover focus after "Edit comment" in the card menu.** The menu is told not to take focus back so the popover keeps it. If the popover closes straight away in the app, this is why.
- No shortcut for the notes panel yet. Keyboard shortcuts are week 8.
- From week 4, still open: macOS Gatekeeper text, the tooltip when a sidecar can't be read, a sidecar changed on disk shows only after the next save (file watching is week 6).
