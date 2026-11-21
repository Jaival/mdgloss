# Handoff

From v0.0.4 (17 Oct) to v0.0.8 (21 Nov). Last updated 21 November 2026.

Every sprint uses the same flow: a `sprint-N` branch, one stacked PR per step (the first targets `sprint-N`, each later PR targets the one before it), merged bottom-up, then `sprint-N` → `main` in one PR and a `vX.Y.Z` tag.

## Versions at a glance

| Version | Sprint (spec week)            | State                                                                                                           |
| ------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 0.0.4   | Week 4: highlights            | Tagged 17 Oct. The starting point of this note.                                                                 |
| 0.0.5   | Week 5: comments, notes panel | Merged into `main` ([#48](https://github.com/Jaival/mdgloss/pull/48)), tagged 31 Oct.                           |
| 0.0.6   | Week 6: live reload           | Merged into `main` with 0.0.7 ([#67](https://github.com/Jaival/mdgloss/pull/67)); #58 closed. Published 21 Nov. |
| 0.0.7   | Week 7: updates               | Merged into `main` ([#67](https://github.com/Jaival/mdgloss/pull/67)), tagged, published 21 Nov as Latest.      |
| 0.0.8   | Update test                   | `sprint-8`: deleted-file notice, version set. First release an installed 0.0.7 should update to.                |

## 0.0.5: comments and notes panel (done)

Between v0.0.4 and the sprint: sidecar three-way merge with atomic writes ([#36](https://github.com/Jaival/mdgloss/pull/36)), per-platform release checklist ([#37](https://github.com/Jaival/mdgloss/pull/37)), dogfooding log ([#38](https://github.com/Jaival/mdgloss/pull/38)), comment popover spike ([#39](https://github.com/Jaival/mdgloss/pull/39)), spec 1.4.

Sprint 5, merged into `sprint-5` then `main`:

1. [#42](https://github.com/Jaival/mdgloss/pull/42) Per-field merge in [`merge.ts`](src/annotations/merge.ts).
2. [#43](https://github.com/Jaival/mdgloss/pull/43) Toolbar ignores keys typed in a text field ([`keys.ts`](src/lib/keys.ts)).
3. [#44](https://github.com/Jaival/mdgloss/pull/44) Comment popover ([`CommentPopover.tsx`](src/annotations/CommentPopover.tsx)).
4. [#45](https://github.com/Jaival/mdgloss/pull/45) Margin marker for commented highlights.
5. [#46](https://github.com/Jaival/mdgloss/pull/46) Notes panel ([`NotesPanel.tsx`](src/annotations/NotesPanel.tsx)).

After: [#49](https://github.com/Jaival/mdgloss/pull/49) Dependabot skips TypeScript majors until typescript-eslint supports 7.

## 0.0.6: live reload (done)

1. [#53](https://github.com/Jaival/mdgloss/pull/53) Exact re-anchoring: [`findQuote`](src/annotations/anchor.ts); `placeHighlights` returns `{ placed, orphaned }`.
2. [#54](https://github.com/Jaival/mdgloss/pull/54) "Text not found" section for orphaned highlights in the notes panel.
3. [#55](https://github.com/Jaival/mdgloss/pull/55) The open file and the folder tree reload on disk changes.
4. [#56](https://github.com/Jaival/mdgloss/pull/56) Sidecar reload: `AnnotationStore.watch`, `useAnnotations` reloads behind the save queue.

Checks passed locally (164 tests). Hand checks, still to do (now on the installed v0.0.7):

- Add a paragraph above a highlight in another editor and save: the highlight follows, scroll stays.
- Edit a highlighted quote: it moves to "Text not found". Undo: it comes back.
- Save from an editor that replaces the file (vim, some IDEs): the reader still reloads.
- In a folder: create, rename, delete a `.md` file: the tree follows. Sidecar writes do not reload the tree.
- Same file in two windows, or a hand-edited sidecar: a highlight added in one shows in the other.
- A file with no `.mdgloss` folder yet: after the first highlight, outside sidecar changes still show.

## 0.0.7: updates (done)

1. [#60](https://github.com/Jaival/mdgloss/pull/60) **Tauri updater**: checks `latest.json` on GitHub Releases at most once a day ([`updates.ts`](src/updates.ts)), downloads in the background, "Restart to update" toolbar button. Dev builds never check. `release.yml` signs update bundles with `TAURI_SIGNING_PRIVATE_KEY`.
2. [#61](https://github.com/Jaival/mdgloss/pull/61) **Reopen last folder or file**: `last-open.json` in app data; `restore_open` re-grants saved paths on start and drops missing ones; `remember_open` saves only paths already in the fs scope.
3. [#62](https://github.com/Jaival/mdgloss/pull/62) macOS and Windows testing guides for beta testers. [#63](https://github.com/Jaival/mdgloss/pull/63) README asks users how they use mdgloss.
4. [#66](https://github.com/Jaival/mdgloss/pull/66) **Updater key**: set 21 Nov. The public key (ID `F617EB7D3DA3947E`) is in [`tauri.conf.json`](src-tauri/tauri.conf.json); the private key and password are repository secrets.

`sprint-7` contains `sprint-6`, so its PR into `main` also carries 0.0.6. v0.0.7 is the first signed release: install it by hand once; updates from it on are automatic. Older versions can't update themselves.

## 0.0.8: first real update (on `sprint-8`)

1. [#70](https://github.com/Jaival/mdgloss/pull/70) **Deleted-file notice**: [`reloadFile`](src/files/reload.ts) reads the open file again on every watcher event, removals included. A file that is gone keeps its last version, shows a notice, and offers no toolbar for new highlights.
2. Version 0.0.8.

The point of this release is the update path: an installed v0.0.7 must offer "Restart to update" and install it. `updates.ts` saves the check time before checking, so a v0.0.7 that already checked today waits up to a day.

## Not scheduled yet

- [`docs/UI-PLAN.md`](docs/UI-PLAN.md) and [`docs/mockups/`](docs/mockups/): UI direction decided 11 Nov (margin notes, sidebar tabs, palette, focus mode).

## Next (in order)

1. A friend runs the hand checks: the 0.0.6 list above, last-open (a folder, a single file, a deleted path), the deleted-file notice (#70), and the macOS release checklist ([MACOS-TESTING.md](docs/MACOS-TESTING.md)).
2. Merge the `sprint-8` stack bottom-up, then `sprint-8` → `main`. Tag v0.0.8 on `main`.
3. Check the v0.0.8 draft: `latest.json` and a `.sig` per update bundle (release checklist in [RELEASING.md](docs/RELEASING.md#release-checklist)). Publish it.
4. First real update test: an installed v0.0.7 offers "Restart to update" within a day and installs 0.0.8. Repeat on macOS if possible. If the download fails, check the `api.github.com/.../assets/<id>` URLs in `latest.json` first.
5. Weeks 8 to 10 (to 13 Dec): [UI plan](docs/UI-PLAN.md) steps 1 to 7 and 9, one stacked PR each, then tag v0.1.0 (alpha). Write the gate script in `scripts/` before the 13 Dec mini-gate.
6. Still open from weeks 4 and 5: release checklist on a Mac, Gatekeeper text in `.github/release-header.md`, first dogfooding session on Windows.
7. Open Dependabot PRs: [#52](https://github.com/Jaival/mdgloss/pull/52), [#64](https://github.com/Jaival/mdgloss/pull/64), [#65](https://github.com/Jaival/mdgloss/pull/65).

## Open decisions and checks

- **Re-anchored offsets aren't saved.** Revisit with fuzzy matching (week 14), which needs `approximate` stored.
- **Re-attaching an orphaned highlight** (spec step 4) isn't built. The menu only deletes.
- **Orphans are easy to miss.** UI plan step 2 (orphan chip) closes this.
- **Comment popover stays open across a reload** and can drift.
- **A sidecar created elsewhere** before this app ever saved isn't picked up until the file is reopened.
- **The open file deleted on disk** keeps its last version with a notice, and new highlights are blocked (0.0.8). Existing ones can still be edited or deleted, and those edits save to the sidecar of a file that is gone.
- **Updater UX:** no "check now" command and no notice when a check fails. Decide after the first real update.
- Carried over: card quote shows raw markdown; notes `Sheet` below ~900px (UI plan step 4); popover focus after "Edit comment"; tooltip for an unreadable sidecar.
