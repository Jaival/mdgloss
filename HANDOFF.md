# Handoff

From v0.0.4 (17 Oct) to the week 7 work (6 Nov). Written 13 November 2026.

Every sprint uses the same flow: a `sprint-N` branch, one stacked PR per step (the first targets `sprint-N`, each later PR targets the one before it), merged bottom-up, then `sprint-N` → `main` in one PR and a `vX.Y.Z` tag.

## Versions at a glance

| Version | Sprint (spec week)            | State                                                                                                                             |
| ------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 0.0.4   | Week 4: highlights            | Tagged 17 Oct. The starting point of this note.                                                                                   |
| 0.0.5   | Week 5: comments, notes panel | Merged into `main` ([#48](https://github.com/Jaival/mdgloss/pull/48)), tagged 31 Oct.                                             |
| 0.0.6   | Week 6: live reload           | Merged into `sprint-6`; version set. [#58](https://github.com/Jaival/mdgloss/pull/58) (`sprint-6` → `main`) open. **Not tagged.** |
| 0.0.7   | Week 7: updates               | Two commits on local branches, **not pushed, no PRs**. Version still reads 0.0.6.                                                 |

## 0.0.5: comments and notes panel (done)

Between v0.0.4 and the sprint: sidecar three-way merge with atomic writes ([#36](https://github.com/Jaival/mdgloss/pull/36)), per-platform release checklist ([#37](https://github.com/Jaival/mdgloss/pull/37)), dogfooding log ([#38](https://github.com/Jaival/mdgloss/pull/38)), comment popover spike ([#39](https://github.com/Jaival/mdgloss/pull/39)), spec 1.4.

Sprint 5, merged into `sprint-5` then `main`:

1. [#42](https://github.com/Jaival/mdgloss/pull/42) Per-field merge in [`merge.ts`](src/annotations/merge.ts).
2. [#43](https://github.com/Jaival/mdgloss/pull/43) Toolbar ignores keys typed in a text field ([`keys.ts`](src/lib/keys.ts)).
3. [#44](https://github.com/Jaival/mdgloss/pull/44) Comment popover ([`CommentPopover.tsx`](src/annotations/CommentPopover.tsx)).
4. [#45](https://github.com/Jaival/mdgloss/pull/45) Margin marker for commented highlights.
5. [#46](https://github.com/Jaival/mdgloss/pull/46) Notes panel ([`NotesPanel.tsx`](src/annotations/NotesPanel.tsx)).

After: [#49](https://github.com/Jaival/mdgloss/pull/49) Dependabot skips TypeScript majors until typescript-eslint supports 7.

## 0.0.6: live reload (merged into `sprint-6`, not in `main`)

1. [#53](https://github.com/Jaival/mdgloss/pull/53) Exact re-anchoring: [`findQuote`](src/annotations/anchor.ts); `placeHighlights` returns `{ placed, orphaned }`.
2. [#54](https://github.com/Jaival/mdgloss/pull/54) "Text not found" section for orphaned highlights in the notes panel.
3. [#55](https://github.com/Jaival/mdgloss/pull/55) The open file and the folder tree reload on disk changes.
4. [#56](https://github.com/Jaival/mdgloss/pull/56) Sidecar reload: `AnnotationStore.watch`, `useAnnotations` reloads behind the save queue.

Checks passed locally (164 tests). Hand checks in `bun tauri dev`, still to do before merging #58:

- Add a paragraph above a highlight in another editor and save: the highlight follows, scroll stays.
- Edit a highlighted quote: it moves to "Text not found". Undo: it comes back.
- Save from an editor that replaces the file (vim, some IDEs): the reader still reloads.
- In a folder: create, rename, delete a `.md` file: the tree follows. Sidecar writes do not reload the tree.
- Same file in two windows, or a hand-edited sidecar: a highlight added in one shows in the other.
- A file with no `.mdgloss` folder yet: after the first highlight, outside sidecar changes still show.

## 0.0.7: updates (local only)

Branches: `sprint-7` (= `sprint-6` head), `feat/updater` on it, `feat/last-open` on that. Neither is pushed.

1. `feat/updater` (3acbbe0) **Tauri updater**: checks `latest.json` on GitHub Releases at most once a day ([`updates.ts`](src/updates.ts)), downloads in the background, "Restart to update" toolbar button. Dev builds never check. `release.yml` signs update bundles with `TAURI_SIGNING_PRIVATE_KEY`.
2. `feat/last-open` (89dd641) **Reopen last folder or file**: `last-open.json` in app data; `restore_open` re-grants saved paths on start and drops missing ones; `remember_open` saves only paths already in the fs scope.

Both touch Rust ([`lib.rs`](src-tauri/src/lib.rs)).

**Blocker for the updater:** `plugins.updater.pubkey` in [`tauri.conf.json`](src-tauri/tauri.conf.json) is still `REPLACE_WITH_UPDATER_PUBLIC_KEY`. Generate the key pair and set the two secrets per [RELEASING.md](docs/RELEASING.md#auto-update), then put the public key in the config. Without it, no release can verify an update.

## Untracked in the working tree

- `CLAUDE.md` (Checks section). Branch `docs/checks-section` holds a committed version; use one, drop the other.
- [`docs/UI-PLAN.md`](docs/UI-PLAN.md) and [`docs/mockups/`](docs/mockups/): UI direction decided 11 Nov (margin notes, sidebar tabs, palette, focus mode). Not scheduled yet.

## Next (in order)

1. Hand-check the 0.0.6 list above. Merge [#58](https://github.com/Jaival/mdgloss/pull/58) into `main`, tag v0.0.6.
2. Updater key pair, secrets and `pubkey` (blocker above).
3. Rebase `sprint-7` on `main` after step 1. Run full CI locally (incl. `cargo fmt`, `cargo clippy`). Push, open the stacked PRs `feat/updater` → `sprint-7`, `feat/last-open` → `feat/updater`.
4. Hand-check: updater with a real older install against a newer tag; last-open with a folder, a single file, and a deleted path.
5. Bump to 0.0.7, merge `sprint-7` into `main`, tag v0.0.7. Mark week 7 in [SPEC.md](docs/SPEC.md).
6. Week 8: tag v0.1.0 (alpha). Decide where the UI plan goes; it absorbs the week 8 notes shortcut.
7. Still open from weeks 4 and 5: release checklist on a Mac, Gatekeeper text in `.github/release-header.md`, first dogfooding session on Windows.
8. Open Dependabot PRs: [#50](https://github.com/Jaival/mdgloss/pull/50), [#52](https://github.com/Jaival/mdgloss/pull/52), [#59](https://github.com/Jaival/mdgloss/pull/59).

## Open decisions and checks

- **Re-anchored offsets aren't saved.** Revisit with fuzzy matching (week 11), which needs `approximate` stored.
- **Re-attaching an orphaned highlight** (spec step 4) isn't built. The menu only deletes.
- **Orphans are easy to miss.** UI plan step 2 (orphan chip) closes this.
- **Comment popover stays open across a reload** and can drift.
- **A sidecar created elsewhere** before this app ever saved isn't picked up until the file is reopened.
- **The open file deleted on disk** keeps showing its last version with no notice.
- **Updater UX:** no "check now" command and no notice when a check fails. Decide after the first real update.
- Carried over: card quote shows raw markdown; notes `Sheet` below ~900px (UI plan step 4); popover focus after "Edit comment"; tooltip for an unreadable sidecar.
