# Handoff

Sprint 2026-10-26 (spec week 4, hardening): make highlights safe to use every day on real course material, on Windows and macOS, without losing an annotation.

## Done

- **Sidecar merged before each save, written atomically** (branch `feat/sidecar-merge`, pushed, no PR yet).
  - [`merge.ts`](src/annotations/merge.ts): three-way merge by highlight id. Additions and edits from both sides are kept, a deletion on either side is kept, and when both sides edited a highlight the later `updated` wins.
  - `AnnotationStore.save(path, annotations, base)` now takes the file the edit started from and resolves to `{ location, file }`. `useAnnotations` shows the merged file unless a newer edit is waiting to save.
  - `SidecarStore` writes `<name>.json.tmp` and renames it over the sidecar. Added `rename` to `FileSystem` and `fs:allow-rename` to the capability.
  - Covered by `merge.test.ts` and `store.test.ts`. Format, lint, typecheck, tests, build, cargo fmt/clippy/test all pass locally.
- **Release checklist for both platforms** (branch `chore/release-checklist`, stacked on `feat/sidecar-merge`, not pushed).
  - [Release checklist](docs/RELEASING.md#release-checklist) in `docs/RELEASING.md`: setup, install (both, Windows only, macOS only), opening files, rendering, selections and highlights, annotations (restart, no `.tmp` left, two windows, fallback storage). Step 5 of "Cutting a release" now points to it.
  - [`docs/release-check/`](docs/release-check/) is the fixed test folder: formatting, escapes, entities, list, table, code, footnote, the four link kinds, a relative image, an `![[…]]` embed, a missing image, and a subfolder for the recursive grant and the `.mdgloss` grant.
  - The six expected quotes were checked by running `toSourceSelection` on the fixture in a throwaway Vitest file. The checklist itself hasn't been run against an installer yet; the first run is the next release.

## Next (sprint order)

1. P0 Trademark (EUIPO/TMview) and domain check for "mdgloss". 0.5h. Needs the user; the agent can only prepare the searches.
2. P1 Start daily dogfooding with a usage/hours log; merge Dependabot #20 and #33. 1h. Run the release checklist's **Annotations** section on Windows as the first dogfooding session: it covers the two-window check below.
3. P2 stretch: week 5 spike on the comment popover data path. 1.5h.

## Open decisions and checks

- **PRs.** Open the PR for `feat/sidecar-merge` into `main`, then push `chore/release-checklist` and open its PR into `main` after the first merges (stacked PRs must target `main`, see DEVOPS.md).
- **Check in the real app**: two windows on the same file, a highlight added in each, both survive. The unit tests use an in-memory fs; the Tauri `rename` replacing an existing file on Windows and macOS is the one path not exercised. It's now a checklist item.
- **macOS Gatekeeper text is probably out of date.** `.github/release-header.md` says right-click → Open. Since macOS 15 that route no longer bypasses Gatekeeper for unsigned apps; the user has to go to **System Settings → Privacy & Security → Open Anyway**. Also unknown: whether the unsigned universal build opens at all on Apple Silicon or reports "damaged". The checklist asks to record both on the first Mac run (week 5) and fix the header then.
- Selecting with the keyboard doesn't open the highlight toolbar (it opens on mouse-up only), so the checklist doesn't test it. Keyboard access comes with the week 5 sidebar.
- A sidecar on disk that can't be read (broken JSON, newer `schemaVersion`) makes the save fail, so `LocalAnnotationStore` falls back to app storage and the header says the folder couldn't be written. Nothing is lost, but the tooltip is wrong for that case. Left as is because it needs a broken sidecar to appear while the file is open.
- A sidecar changed on disk is merged at the next save, not shown straight away. Reload on change comes with file watching (week 6).
