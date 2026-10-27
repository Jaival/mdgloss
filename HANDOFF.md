# Handoff

Sprint 2026-10-26 (spec week 4, hardening): make highlights safe to use every day on real course material, on Windows and macOS, without losing an annotation.

## Done

- **Sidecar merged before each save, written atomically** (branch `feat/sidecar-merge`).
  - [`merge.ts`](src/annotations/merge.ts): three-way merge by highlight id. Additions and edits from both sides are kept, a deletion on either side is kept, and when both sides edited a highlight the later `updated` wins.
  - `AnnotationStore.save(path, annotations, base)` now takes the file the edit started from and resolves to `{ location, file }`. `useAnnotations` shows the merged file unless a newer edit is waiting to save.
  - `SidecarStore` writes `<name>.json.tmp` and renames it over the sidecar. Added `rename` to `FileSystem` and `fs:allow-rename` to the capability.
  - Covered by `merge.test.ts` and `store.test.ts`. Format, lint, typecheck, tests, build, cargo fmt/clippy/test all pass locally.

## Next (sprint order)

1. P0 Write the per-platform release checklist in `docs/RELEASING.md` (run it on a Mac in week 5). 0.5h.
2. P0 Trademark (EUIPO/TMview) and domain check for "mdgloss". 0.5h. Needs the user; the agent can only prepare the searches.
3. P1 Start daily dogfooding with a usage/hours log; merge Dependabot #20 and #33. 1h.
4. P2 stretch: week 5 spike on the comment popover data path. 1.5h.

## Open decisions and checks

- **Check in the real app**: two windows on the same file, a highlight added in each, both survive. The unit tests use an in-memory fs; the Tauri `rename` replacing an existing file on Windows and macOS is the one path not exercised. Do it first thing when dogfooding starts.
- A sidecar on disk that can't be read (broken JSON, newer `schemaVersion`) makes the save fail, so `LocalAnnotationStore` falls back to app storage and the header says the folder couldn't be written. Nothing is lost, but the tooltip is wrong for that case. Left as is because it needs a broken sidecar to appear while the file is open.
- A sidecar changed on disk is merged at the next save, not shown straight away. Reload on change comes with file watching (week 6).
