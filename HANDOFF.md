# Handoff

From v0.0.8 (21 Nov 2026) to the v0.1.0 alpha (13 Dec). Written 21 November 2026, at the start of sprint 9; updated 22 November, when all sprint 9 code had merged into `sprint-9`.

Every sprint uses the same flow: a `sprint-N` branch from `main`, one stacked PR per step (the first targets `sprint-N`, each later PR targets the one before it), merged bottom-up, then `sprint-N` → `main` in one PR and a `vX.Y.Z` tag. When merging a stack by hand: retarget the next PR to `sprint-N` first, then merge without `--delete-branch` (the repo deletes head branches itself; `--delete-branch` once closed the next PR instead of retargeting it).

Before every push, run all `ci.yml` steps locally, including `cargo fmt --all -- --check` (see the Checks section in [CLAUDE.md](CLAUDE.md)).

## Where things stand

| Version | What                                                                                                                                             | State                                                                                            |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| 0.0.5   | Comments, notes panel                                                                                                                            | Published                                                                                        |
| 0.0.6   | Live reload, exact re-anchoring, "Text not found" list                                                                                           | Published 21 Nov (came into `main` with 0.0.7, [#67](https://github.com/Jaival/mdgloss/pull/67)) |
| 0.0.7   | Tauri updater, reopen last folder or file                                                                                                        | Published 21 Nov. First signed release; older versions can't update themselves                   |
| 0.0.8   | Deleted-file notice ([#70](https://github.com/Jaival/mdgloss/pull/70)), docs and schedule ([#72](https://github.com/Jaival/mdgloss/pull/72))     | Published 21 Nov as Latest ([#73](https://github.com/Jaival/mdgloss/pull/73))                    |
| 0.1.0   | Alpha: UI plan steps 1–9 and the gate script ([#75](https://github.com/Jaival/mdgloss/pull/75)–[#83](https://github.com/Jaival/mdgloss/pull/83)) | All merged into `sprint-9`. Waiting on hand checks, then `sprint-9` → `main` and the tag         |

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

## Sprint 9 (weeks 8–10, 23 Nov – 13 Dec)

The plan is [docs/UI-PLAN.md](docs/UI-PLAN.md). Every step is built, reviewed and merged into `sprint-9` (CI green on each PR). None of it has been tried in the running app yet.

| Step                                             | PR                                               | Hand checks (full list in the PR)                                                                 |
| ------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| 1 Tokens                                         | [#75](https://github.com/Jaival/mdgloss/pull/75) | none (no visual change)                                                                           |
| 2 Header: breadcrumb, highlight and orphan chips | [#76](https://github.com/Jaival/mdgloss/pull/76) | 6+ orphans, one a long URL quote: popover scrolls, delete works, card not cut off                 |
| 3 Sidebar Files / Outline tabs                   | [#77](https://github.com/Jaival/mdgloss/pull/77) | heading in view marked; click scrolls                                                             |
| 5 Command palette                                | [#78](https://github.com/Jaival/mdgloss/pull/78) | heading inside a blockquote; note jump with the toolbar open                                      |
| 4 Margin notes                                   | [#79](https://github.com/Jaival/mdgloss/pull/79) | cards vs mockup A; reader width across 56rem; long card expands; font size, images, reload        |
| 7 Sepia theme                                    | [#80](https://github.com/Jaival/mdgloss/pull/80) | header, sidebar, palette, code block, 4 highlight colours, focus ring                             |
| 8 Font pickers (Settings)                        | [#81](https://github.com/Jaival/mdgloss/pull/81) | Obel Mono in code; both choices survive a restart; previews in their own font                     |
| 6 Focus mode                                     | [#82](https://github.com/Jaival/mdgloss/pull/82) | Esc order; mode survives restart; progress, ticks; reading place kept on switch; `Cmd+.` on macOS |
| Gate script                                      | [#83](https://github.com/Jaival/mdgloss/pull/83) | `bun run gate mini <reading folder>`                                                              |

Step 9 (docs) went in with each step. Fonts (step 8) came in this sprint after all: an editor (mono) and an interface (sans) font in a new Settings dialog, all bundled; see DESIGN.md section 4.

Left before 13 Dec:

1. **Hand checks** above, on `bun tauri dev` or a build of `sprint-9`.
2. **`sprint-9` → `main`** in one PR, then **tag v0.1.0**. It's a minor release, so check the `.msi` too ([RELEASING.md](docs/RELEASING.md#release-checklist)).
3. **Mini-gate on 13 Dec**: `bun run gate mini <reading folder>...` ([how](docs/DOGFOODING.md#checking-the-gates)). Kept as is: week 7 had no use (reason in [DOGFOODING.md](docs/DOGFOODING.md#missed-days)), so it fails; the decision was to accept that, not move the gate.
4. Write down the 10 most annoying problems in DOGFOODING.md.
5. Open Dependabot PRs: [#52](https://github.com/Jaival/mdgloss/pull/52) and [#69](https://github.com/Jaival/mdgloss/pull/69) (bun), [#68](https://github.com/Jaival/mdgloss/pull/68) (cargo).

How sprint 9 was built, in case it helps next time: independent steps ran in parallel worktree threads (each kept its UI in new files and changed only its own block of `App.tsx`), then were rebased into one stack. Conflicts were only import lines and one union type.

## Open decisions and checks

- **Updater UX:** no "check now" command and no notice when a check fails. Decide after the first real update.
- **Notes panel** is now a `Sheet` at every width (#79), not only below ~900px: it is the only list of orphaned highlights. The margin hides below 56rem of reader width.
- **Focus mode** (#82): no visible leave control (mouse users leave via the file pill → palette); `Ctrl+B` still toggles the hidden sidebar; hints say "Ctrl" on macOS.
- **Fonts** (#81): a saved non-default font shows IBM Plex Sans until it loads; a font that fails to load resets the saved choice. Removing the `:root` font defaults in `index.css` would break every font (Tailwind emits a self-referencing `--font-sans` in `@layer theme`).
- **Outline** (#77): a short last section may never be marked as in view; the mark updates on scroll, not on image load or resize.
- **The open file deleted on disk** keeps its last version with a notice, and new highlights are blocked. Existing ones can still be edited or deleted; those edits save to the sidecar of a file that is gone. On Linux, inotify may drop the watch on a deleted file, so a restored file isn't seen until reopened.
- **Re-anchored offsets aren't saved.** Revisit with fuzzy matching (week 14), which needs `approximate` stored.
- **Re-attaching an orphaned highlight** isn't built (week 14). The menu only deletes.
- **Comment popover stays open across a reload** and can drift.
- **A sidecar created elsewhere** before this app ever saved isn't picked up until the file is reopened.
- Closed in sprint 9: orphans are easy to miss (#76), notes `Sheet` below ~900px (#79), no notes shortcut (#82), serif reading font (none; the reader follows the interface font, #81).
- Carried over: card quote shows raw markdown; popover focus after "Edit comment"; tooltip for an unreadable sidecar.

## History

Earlier sprints, in short. PR numbers link the details.

- **0.0.5** (31 Oct): sidecar three-way merge with atomic writes (#36), release checklist (#37), dogfooding log (#38); per-field merge (#42), toolbar ignores text fields (#43), comment popover (#44), margin marker (#45), notes panel (#46).
- **0.0.6**: exact re-anchoring with `findQuote` (#53), "Text not found" section (#54), file and tree reload (#55), sidecar reload (#56).
- **0.0.7**: Tauri updater (#60), reopen last folder or file (#61), testing guides (#62), README feedback ask (#63), updater public key `F617EB7D3DA3947E` (#66; private key and password are repository secrets).
- **0.0.8**: deleted-file notice (#70), version (#71), docs refresh and the new schedule: alpha on 13 Dec with the UI plan, edit mode after launch (#72).
- **0.1.0** (sprint 9): reader tokens (#75), header chips (#76), sidebar outline (#77), command palette (#78), margin notes (#79), sepia theme (#80), font pickers (#81), focus mode (#82), gate script (#83).
