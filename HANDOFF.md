# Handoff

Sprint 2026-11-09 (spec week 6): live reload. Branch `sprint-6`; each step is its own PR, stacked: the first targets `sprint-6` and each later PR targets the one before it, and `sprint-6` merges into `main` when the week is done. Started early, on 5 November.

## Done (PRs open, 5 Nov)

Merge in this order, each into `sprint-6`. Head branches are deleted on merge, so GitHub retargets the next PR to `sprint-6`. Merge a PR only after its base PR has merged.

1. [#53](https://github.com/Jaival/mdgloss/pull/53) **Exact re-anchoring**: [`findQuote`](src/annotations/anchor.ts), steps 1 and 2 of the spec. `placeHighlights` now returns `{ placed, orphaned }`. 15 tests on edited fixtures in `anchor.test.ts`. Nothing is written back to the sidecar.
2. [#54](https://github.com/Jaival/mdgloss/pull/54) **Orphaned list**: a collapsed "Text not found" section at the bottom of the notes panel, `Unlink` icon, muted cards, menu with Delete only.
3. [#55](https://github.com/Jaival/mdgloss/pull/55) **Document and tree reload**: the open file re-renders in place when it changes on disk; a folder workspace reloads its tree on files created, removed or renamed. Renames from the native watcher now map to removed + created.
4. [#56](https://github.com/Jaival/mdgloss/pull/56) **Sidecar reload**: `AnnotationStore.watch`; `SidecarStore` watches the `.mdgloss` folder; `useAnnotations` reloads behind the save queue.

All four pass format, lint, typecheck, tests (164), build and the Rust checks locally. None touch Rust.

## Not checked in the app

No component tests, and file watching needs Tauri, so every step is unchecked by hand. Run `bun tauri dev` and check before merging `sprint-6` into `main`:

- Open a highlighted file, add a paragraph above a highlight in another editor and save: the highlight follows, scroll stays.
- Edit a highlighted quote: it moves to "Text not found" in the notes panel. Undo the edit: it comes back.
- Save from an editor that replaces the file (vim, some IDEs): the reader still reloads.
- In a folder workspace, create, rename and delete a `.md` file: the tree follows. Highlighting (sidecar writes) does not reload the tree.
- Open the same file in two windows (or edit the sidecar by hand): a highlight added in one shows in the other without a save.
- A file with no `.mdgloss` folder yet: after the first highlight, sidecar changes from elsewhere still show.

## Next (sprint order)

1. Hand-check the list above, merge the four PRs into `sprint-6`.
2. Still open from week 5: release checklist on a Mac; Gatekeeper text in `.github/release-header.md`.
3. Still open from week 4: first dogfooding session on Windows.
4. Merge `sprint-6` into `main`, update the week 6 row, tag v0.0.6.
5. Week 7: Tauri updater, remember last opened folder.

## Open decisions and checks

- **Re-anchored offsets aren't saved.** Placement runs on every render and the sidecar keeps the saved `offset` and `status`. Saving them would make step 1 faster after big edits and let other tools see `orphaned`, but every reload would then write a file. Revisit with fuzzy matching (week 11), which needs `approximate` stored.
- **Re-attaching an orphaned highlight** to new text (spec step 4) isn't built. The menu only deletes.
- **Orphans are easy to miss.** The notes panel is closed by default and the section is collapsed. Consider a count on the notes button.
- **The comment popover stays open across a reload.** Its anchor may be replaced, so it can drift. A comment typed on a new selection keeps the old offsets; re-anchoring finds the quote on the next render if it is still there.
- **A sidecar created elsewhere** (no `.mdgloss` folder when the file opened, and this app never saved) isn't picked up until the file is opened again.
- **The open file deleted on disk** keeps showing its last version with no notice.
- Carried over: card quote shows raw markdown; notes panel `Sheet` below ~900px; popover focus after "Edit comment"; no notes shortcut (week 8); macOS Gatekeeper text; tooltip for an unreadable sidecar.
