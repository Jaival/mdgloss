# Handoff

From v0.0.8 (21 Nov 2026) to the v0.1.0 alpha (13 Dec). Written 21 November 2026, at the start of sprint 9.

Every sprint uses the same flow: a `sprint-N` branch from `main`, one stacked PR per step (the first targets `sprint-N`, each later PR targets the one before it), merged bottom-up, then `sprint-N` → `main` in one PR and a `vX.Y.Z` tag. When merging a stack by hand: retarget the next PR to `sprint-N` first, then merge without `--delete-branch` (the repo deletes head branches itself; `--delete-branch` once closed the next PR instead of retargeting it).

Before every push, run all `ci.yml` steps locally, including `cargo fmt --all -- --check` (see the Checks section in [CLAUDE.md](CLAUDE.md)).

## Where things stand

| Version | What                                                                                                                                         | State                                                                                            |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 0.0.5   | Comments, notes panel                                                                                                                        | Published                                                                                        |
| 0.0.6   | Live reload, exact re-anchoring, "Text not found" list                                                                                       | Published 21 Nov (came into `main` with 0.0.7, [#67](https://github.com/Jaival/mdgloss/pull/67)) |
| 0.0.7   | Tauri updater, reopen last folder or file                                                                                                    | Published 21 Nov. First signed release; older versions can't update themselves                   |
| 0.0.8   | Deleted-file notice ([#70](https://github.com/Jaival/mdgloss/pull/70)), docs and schedule ([#72](https://github.com/Jaival/mdgloss/pull/72)) | Published 21 Nov as Latest ([#73](https://github.com/Jaival/mdgloss/pull/73))                    |
| 0.1.0   | Alpha: UI plan steps 1–7 and 9                                                                                                               | Sprint 9, `sprint-9` created from `main` (`c017e93`)                                             |

The v0.0.8 release was checked: `latest.json` has 9 platform entries, each with a signature; the NSIS, MSI and macOS keys point at their own bundles. `releases/latest/download/latest.json` returns 0.0.8, and the `api.github.com/.../assets/<id>` URLs download with `Accept: application/octet-stream` (the open question from 0.0.7).

## Waiting on people

1. **First real update test.** An installed v0.0.7 should show "Restart to update to 0.0.8" and install it. `updates.ts` saves the check time before it checks (`localStorage` key `mdgloss.lastUpdateCheck`), so a v0.0.7 that already checked today waits up to a day. Then: the version reads 0.0.8, and deleting the open file shows the notice. Repeat on macOS if possible. If no button shows after a day, the check failed silently (no notice yet, see Updater UX below); start from the manifest URL, the asset URLs and the signatures in `latest.json`.
2. **A friend runs the hand checks** on the installed build:
   - Add a paragraph above a highlight in another editor and save: the highlight follows, scroll stays.
   - Edit a highlighted quote: it moves to "Text not found". Undo: it comes back.
   - Save from an editor that replaces the file (vim, some IDEs): the reader still reloads, with no deleted-file notice.
   - In a folder: create, rename, delete a `.md` file: the tree follows. Sidecar writes do not reload the tree.
   - Same file in two windows, or a hand-edited sidecar: a highlight added in one shows in the other.
   - A file with no `.mdgloss` folder yet: after the first highlight, outside sidecar changes still show.
   - Last-open: a folder, a single file, and a path deleted between runs.
   - Deleted-file notice: delete the open file (notice, no toolbar on selecting), restore it (notice goes). Delete A, open B, restore A, open A: no notice.
   - The macOS release checklist ([MACOS-TESTING.md](docs/MACOS-TESTING.md)), including which Gatekeeper step worked.

## Next: sprint 9 (weeks 8–10, 23 Nov – 13 Dec)

The plan is [docs/UI-PLAN.md](docs/UI-PLAN.md); the schedule is in [SPEC.md](docs/SPEC.md#plan). One stacked PR per step, on `sprint-9`:

1. **Tokens** (`--font-reader`, `--font-reader-heading`, `--reader-size`, `--reader-measure`). No visual change.
2. **Header**: breadcrumb, highlight count chip, orphan chip opening "Text not found".
3. **Sidebar tabs**: Files and Outline (headings with note counts, heading in view marked, click to scroll).
4. **Margin notes**: the hard step. Put card layout in a pure, tested function; keep DOM measuring thin. Below ~900px the `NotesPanel` shows as a `Sheet`.
5. **Command palette** (`Ctrl/Cmd+K`).
6. **Focus mode**. Needs 4 and 5 first.
7. **Sepia theme**.
8. _(Not in v0.1.0)_ Fonts, when they are supplied.
9. **Docs**: DESIGN.md sections 4, 5, 8 and 10, updated with each step, not at the end.

Steps 1 to 3 and 5 are independent. Suggested order: 1, 2, 3, 5, 4, 6, 7.

Also before 13 Dec:

- **Gate script** in `scripts/`: counts the days on which an annotation was `created` or `updated` (both are ISO timestamps on each highlight in the sidecars and the app-storage files), for a date range. It answers the 13 Dec mini-gate (weeks 7–10, at least 3 days a week) and the January gate (20 of 31 days).
- **Mini-gate on 13 Dec**: kept as is. Week 7 had no use (reason in [DOGFOODING.md](docs/DOGFOODING.md#missed-days)), so it fails; the decision was to accept that, not move the gate.
- **Tag v0.1.0** after the sprint merges. It's a minor release, so check the `.msi` too ([RELEASING.md](docs/RELEASING.md#release-checklist)). Write down the 10 most annoying problems in DOGFOODING.md.
- Open Dependabot PRs: [#52](https://github.com/Jaival/mdgloss/pull/52) and [#69](https://github.com/Jaival/mdgloss/pull/69) (bun), [#68](https://github.com/Jaival/mdgloss/pull/68) (cargo).

## Open decisions and checks

- **Updater UX:** no "check now" command and no notice when a check fails. Decide after the first real update.
- **Serif reading font**: focus mode only, or a separate reader setting. Decide when the fonts arrive.
- **The open file deleted on disk** keeps its last version with a notice, and new highlights are blocked. Existing ones can still be edited or deleted; those edits save to the sidecar of a file that is gone. On Linux, inotify may drop the watch on a deleted file, so a restored file isn't seen until reopened.
- **Re-anchored offsets aren't saved.** Revisit with fuzzy matching (week 14), which needs `approximate` stored.
- **Re-attaching an orphaned highlight** isn't built (week 14). The menu only deletes.
- **Comment popover stays open across a reload** and can drift.
- **A sidecar created elsewhere** before this app ever saved isn't picked up until the file is reopened.
- Closed by the UI plan: orphans are easy to miss (step 2), notes `Sheet` below ~900px (step 4), no notes shortcut (step 6).
- Carried over: card quote shows raw markdown; popover focus after "Edit comment"; tooltip for an unreadable sidecar.

## History

Earlier sprints, in short. PR numbers link the details.

- **0.0.5** (31 Oct): sidecar three-way merge with atomic writes (#36), release checklist (#37), dogfooding log (#38); per-field merge (#42), toolbar ignores text fields (#43), comment popover (#44), margin marker (#45), notes panel (#46).
- **0.0.6**: exact re-anchoring with `findQuote` (#53), "Text not found" section (#54), file and tree reload (#55), sidecar reload (#56).
- **0.0.7**: Tauri updater (#60), reopen last folder or file (#61), testing guides (#62), README feedback ask (#63), updater public key `F617EB7D3DA3947E` (#66; private key and password are repository secrets).
- **0.0.8**: deleted-file notice (#70), version (#71), docs refresh and the new schedule: alpha on 13 Dec with the UI plan, edit mode after launch (#72).
