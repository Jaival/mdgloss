# mdgloss project spec

Version 1.4 of this spec, 24 October 2026. The project name is mdgloss.

## What it is

A reader-first markdown app for Windows, Mac and the web. You open any markdown file or folder, read it, and highlight, comment and bookmark as you go. Your annotations never change the markdown file itself. They live in sidecar files next to it, so they travel with the folder through git, Dropbox or OneDrive.

It is not a note-taking system. There is no graph, no backlinks and no plugin API. Editing exists, but reading comes first.

## Who it is for

Developers and students who read dense technical markdown they didn't write: documentation, READMEs, course material, specs. The public launch targets developers first (Show HN, GitHub, r/programming), then students through study communities.

The first user is me, reading my own M.Sc. course material.

## Principles

1. The markdown file is only changed when the user edits it in edit mode. Highlights, comments and bookmarks never write into it.
2. The app never deletes an annotation on its own. Only the user can.
3. Local first. No account, no server and no analytics. Usage is estimated from anonymous update checks, and the README says so.

## Scope

### Version 1 (public launch)

- Open a file or a folder, with a file tree showing `.md` files.
- Rendering: GitHub-flavoured markdown, tables, code highlighting, images with relative paths, light and dark theme.
- Highlights in several colours, with an optional comment on each.
- Bookmarks that point at a file, a heading, or a spot in the text, with an optional label. One bookmarks panel for the whole folder, grouped by file.
- Automatic last-read position for every file.
- Annotation sidebar for the current file. Clicking an entry scrolls to it.
- Live reload when a file changes on disk, with highlights re-anchored.
- Re-anchoring in three steps: exact match, fuzzy match, orphaned section.
- Edit mode, if the plan leaves room for it: files open in preview; a button or Ctrl/Cmd+E switches to a CodeMirror source editor, and highlights are re-anchored when the file is saved. If it doesn't fit, version 1 ships an "Open in editor" button instead and edit mode follows after launch.
- Export annotations as markdown, for one file or a whole folder, or copy to clipboard.
- Desktop apps for Windows and Mac, signed, with auto-update.
- Web demo that opens with pre-annotated sample documents. Folder access works in Chrome and Edge; Safari and Firefox get single-file open.

### Not in version 1

Live-preview (WYSIWYG) editing, sync, cross-file search, tags, graph view, plugins, mobile apps, writing highlights into the file ("bake in", a candidate for 1.1), Linux builds (easy to add later with Tauri, but not tested for launch).

## Architecture

### Stack

| Layer            | Choice                                              |
| ---------------- | --------------------------------------------------- |
| Desktop shell    | Tauri 2 (official fs, dialog, updater plugins)      |
| UI               | React + TypeScript, built with Vite                 |
| Markdown         | remark / rehype (unified), keeping source positions |
| Editor           | CodeMirror 6                                        |
| Fuzzy matching   | diff-match-patch                                    |
| Browser tests    | Playwright on Chromium, WebKit and Firefox          |
| CI/CD            | GitHub Actions                                      |
| Web demo hosting | GitHub Pages                                        |

### File system interface

All file access goes through one interface. The rest of the app never knows whether it runs in Tauri or in a browser.

```ts
interface FileSystem {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  listDir(path: string): Promise<Entry[]>;
  watch(path: string, onChange: (e: ChangeEvent) => void): Unsubscribe;
  canWrite(path: string): Promise<boolean>;
}
```

Adapters: `TauriFileSystem` (desktop), `BrowserFileSystem` (File System Access API), `DemoFileSystem` (in-memory sample docs for the web demo).

### Annotation storage

Hybrid. Annotations go into a hidden sidecar folder next to the markdown file, whether the file was opened on its own or through its folder, so both ways show the same annotations:

```
os-course-notes/
  week1.md
  week2.md
  .mdgloss/
    week1.md.json
```

When the sidecar can't be written (a read-only location, or a browser without folder access), annotations go into the app's own storage (app data directory on desktop, IndexedDB on the web), keyed by absolute path. A content hash in the key, so annotations could follow a moved file, is deferred until something needs it. The UI shows a small indicator when a file uses this fallback. Annotations found in the app's storage for a file whose sidecar can be written are moved into the sidecar.

A sidecar can change while the app has its file open: another device syncs it, a `git pull` updates it, or a second window saves it. Before every write, the app re-reads the sidecar and merges by highlight `id` against the version it last read or wrote. Additions and edits from both sides are kept, a deletion on either side is kept, and when both sides changed the same highlight it is merged per field: a field changed on one side only is kept, and for a field changed on both sides the later `updated` wins. Writes go to a temporary file that is then renamed over the sidecar, so a crash or a sync client never sees a half-written file.

### Data model

```json
{
  "schemaVersion": 1,
  "file": "week1.md",
  "lastRead": { "offset": 5120 },
  "highlights": [
    {
      "id": "h_8f2a",
      "quote": "a process is a program in execution",
      "prefix": "In simple terms, ",
      "suffix": ". Each process has",
      "offset": 1432,
      "color": "yellow",
      "comment": "exam definition",
      "status": "anchored",
      "created": "2026-10-20T14:02:00Z",
      "updated": "2026-10-20T14:02:00Z"
    }
  ],
  "bookmarks": [
    {
      "id": "b_11c0",
      "target": { "type": "heading", "text": "Priority Scheduling", "level": 2 },
      "label": "review before exam"
    },
    {
      "id": "b_11c1",
      "target": {
        "type": "position",
        "quote": "...",
        "prefix": "...",
        "suffix": "...",
        "offset": 3300
      },
      "label": null
    },
    { "id": "b_11c2", "target": { "type": "file" }, "label": null }
  ]
}
```

`status` is one of `anchored`, `approximate` (placed by fuzzy match, waiting for the user to confirm) or `orphaned`. `schemaVersion` exists from day one so the format can change later without breaking old files.

Prefix and suffix are 32 characters each by default.

### Selection to source mapping

remark keeps the start and end offset in the markdown source for every node. The renderer writes these onto the HTML elements as data attributes. When the user selects text in the preview, the app walks from the selection to the nearest elements and computes the matching offsets in the source. Highlights are stored against the source text, not the rendered HTML, so they survive theme changes and rendering changes.

This is the riskiest piece of the project and gets its own week, with unit tests on fixture files (formatting inside the selection, selections spanning list items, code blocks, tables).

### Re-anchoring

Runs when a file is opened and whenever it changes on disk or in the editor.

1. Look near the stored offset for `prefix + quote + suffix`. If found, done.
2. Search the whole file for the exact quote. If found once, or found several times and the prefix and suffix pick one, done.
3. Fuzzy match with diff-match-patch, starting from the stored offset. Above a similarity threshold (tuned during the alpha, starting around 0.8), place the highlight and set status to `approximate`.
4. Otherwise set status to `orphaned`. Orphaned highlights appear in a section at the bottom of the sidebar with their quote and comment. The user can re-attach one by selecting new text, or delete it.

In edit mode, highlights are re-anchored when the file is saved. Mapping highlight positions through each change as the user types (CodeMirror can do this) is a later improvement.

## Platforms and distribution

- Windows and macOS builds from GitHub Actions on every tagged release.
- macOS: Developer ID signing and notarization (Apple Developer Program, about $99 a year). Enrol in week 17 (late January), so approval is done before signing is built in March.
- Windows: code signing certificate or a signing service. Choose by week 17: apply to the SignPath Foundation (free for open-source projects, but approval takes time) and compare paid options as the fallback. SmartScreen builds reputation from downloads whatever the certificate, so earlier signed builds help.
- Auto-update through the Tauri updater, with the manifest hosted on GitHub Releases. It checks at most once a day. The manifest's download count, summed across releases, is the weekly-usage proxy (see [Success criteria](#success-criteria)).
- Unsigned release builds from week 1: every `v*` tag produces Windows and macOS installers on a draft release. The auto-updater follows in week 7. Only OS code signing waits until March, because it costs money and the only users before then are me and a few beta testers.
- Every release is checked by hand on both Windows and macOS before it is published. Development happens on Windows, and some bugs only show on macOS (the `.mdgloss` folder grant in week 4 was one).
- The Tauri updater signs update files with its own free key pair (`tauri signer generate`), separate from OS code signing, so auto-updates work before the app is signed.

## Plan

Budget: 5 to 10 hours a week. The alpha date requires close to 9 hours a week through November. Moving the release pipeline into week 1 uses most of the week 8 buffer, so there is little slack left before the alpha. If a week goes badly, cut from the "stretch" items first, then move the alpha by one week rather than skipping tests.

Weeks 0 to 4 finished a week early (week 4 shipped as v0.0.4 on 17 October). The freed week goes to hardening what exists, not to starting week 5 early. Use the app for real reading from now on, not only from week 7.

Each week is planned with about 75% of the expected hours committed and one stretch item. At the end of the week, update the Status column and note the hours actually spent, so later phases can be planned from real numbers.

### Phase 1: personal alpha (ends Sunday 29 November 2026)

| Week | Dates          | Goal                       | Done when                                                                                                                                                                                                                                                                                                                                                   | Status                                                        |
| ---- | -------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 0    | 30 Sep – 4 Oct | Setup                      | Name picked (mdgloss), repo public with MIT licence, Tauri 2 + React + TS + Vite scaffold runs, ESLint and Prettier set up, GitHub Actions runs typecheck and tests on every push                                                                                                                                                                           | Done                                                          |
| 1    | 5 – 11 Oct     | Release pipeline and files | Pushing a `v*` tag builds unsigned Windows and macOS installers in GitHub Actions and attaches them to a draft pre-release (test with `v0.0.1`); `FileSystem` Tauri adapter; open file and open folder dialogs                                                                                                                                              | Done                                                          |
| 2    | 12 – 18 Oct    | File tree and rendering    | File tree listing `.md` files; remark/rehype pipeline with GFM, code highlighting, relative images; source offsets on elements; readable layout, light and dark theme                                                                                                                                                                                       | Done                                                          |
| 3    | 19 – 25 Oct    | Selection mapping          | Selection in preview converts to source offsets and a quote/prefix/suffix; unit tests on at least 10 fixture cases                                                                                                                                                                                                                                          | Done (19 fixture cases)                                       |
| 4    | 26 Oct – 1 Nov | Highlights and hardening   | Highlights render across element boundaries, colours, delete; sidecar read/write with `schemaVersion`, also for single files; fallback storage when the sidecar can't be written. Hardening: sidecar re-read and merged before each save, written atomically; release checklist for both platforms written; trademark and domain checked; daily use started | Highlights done early (v0.0.4, 17 Oct); hardening in progress |
| 5    | 2 – 8 Nov      | Comments and sidebar       | Comment popover on highlights; sidebar lists the current file's highlights; click to scroll; the latest release checked on macOS with the release checklist (single file and folder, `.mdgloss` grant, selections across formatting)                                                                                                                        | Not started                                                   |
| 6    | 9 – 15 Nov     | Live reload                | File watching, re-render on change, exact re-anchoring (steps 1 and 2); anything unmatched goes to a simple orphaned list; a sidecar changed on disk reloads its annotations; tests with edited fixtures                                                                                                                                                    | Not started                                                   |
| 7    | 16 – 22 Nov    | Updates                    | Tauri updater checks GitHub Releases at most once a day, so every new tag reaches your installed alpha; remember last opened folder; fix what daily use found                                                                                                                                                                                               | Not started                                                   |
| 8    | 23 – 29 Nov    | Alpha                      | Tag `v0.1.0` (the release title says alpha; the Windows MSI build rejects `-alpha`) and install it from the release page; keyboard shortcuts if time allows; write down the 10 most annoying problems                                                                                                                                                       | Not started                                                   |

Moved out of the alpha to make November possible: bookmarks, last-read position, fuzzy matching, edit mode and export. They follow in December and January.

### Phase 2: complete the features (30 November 2026 – 31 January 2027)

| Week  | Dates           | Goal                             | Done when                                                                                                                                                                                 | Status      |
| ----- | --------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 9–10  | 30 Nov – 13 Dec | Bookmarks                        | File, heading and position bookmarks; bookmarks panel for the whole folder; automatic last-read position; the mini-gate on 13 December (see "The January gate")                           | Not started |
| 11    | 14 – 20 Dec     | Fuzzy re-anchoring               | diff-match-patch step, `approximate` status with a confirm action, orphaned section with re-attach                                                                                        | Not started |
| 12–13 | 21 Dec – 3 Jan  | Holidays                         | Light weeks. Keep using the app, fix small bugs only                                                                                                                                      | Not started |
| 14    | 4 – 10 Jan      | Export                           | Markdown export for one file and a whole folder, grouped by heading; copy to clipboard                                                                                                    | Not started |
| 15    | 11 – 17 Jan     | Demo documents and browser tests | `DemoFileSystem` with 3 to 4 pre-annotated sample docs; the web build with it runs Playwright tests on Chromium, WebKit and Firefox in CI (open, select, highlight, reload)               | Not started |
| 16    | 18 – 24 Jan     | Edit mode (could have)           | CodeMirror source editor behind a button and Ctrl/Cmd+E, save to disk, highlights re-anchored on save. If the week runs short: an "Open in editor" button instead, edit mode after launch | Not started |
| 17    | 25 – 31 Jan     | Gate check and signing prep      | See "The January gate" below; Apple Developer enrolment started; Windows signing route chosen and applied for                                                                             | Not started |

### Phase 3: exams (February 2027)

Weeks 18 to 21, 1 to 28 February. Adjust these dates to the real exam period once it's known. Two to three hours a week at most: write tests for the re-anchoring code, start the README, collect screenshots. No new features.

The classmate beta runs during these weeks: 3 to 5 classmates use the app for their own exam reading, on unsigned builds. Everything they run into goes on one list. It costs little time, and it is the first use by someone other than me.

### Phase 4: ship (1 March – 18 April 2027)

| Week  | Dates          | Goal                          | Done when                                                                                                                                                                                                                                                                                                                                        | Status      |
| ----- | -------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| 22–23 | 1 – 14 Mar     | Signing                       | Apple Developer ID signing and notarization and Windows code signing in the existing release workflow                                                                                                                                                                                                                                            | Not started |
| 24–25 | 15 – 28 Mar    | Web demo and launch readiness | `BrowserFileSystem` adapter, single-file fallback for Safari and Firefox, the demo deployed to GitHub Pages (`DemoFileSystem` is done in week 15); fix what the classmate beta found; Content Security Policy set; branch protection on `main`; README says how update checks are counted; weekly-users formula checked against the beta numbers | Not started |
| 26    | 29 Mar – 4 Apr | Launch material               | README with a demo GIF, short landing page, wider private beta with 5 to 10 people (classmates and developer friends)                                                                                                                                                                                                                            | Not started |
| 27    | 5 – 11 Apr     | Release candidate             | Fix beta feedback, write the Show HN post, tag `v1.0.0`                                                                                                                                                                                                                                                                                          | Not started |
| 28    | 12 – 18 Apr    | Launch                        | Post on Tuesday 13 April: Show HN, then Reddit and LinkedIn. Spend the week answering comments and fixing urgent bugs                                                                                                                                                                                                                            | Not started |

## Success criteria

Measured on 13 July 2027, three months after launch, in this order of importance:

1. I use it daily for my studies from January 2027.
2. 50 or more weekly users, estimated from update checks. The updater checks at most once a day, so a week's checks (the manifest's download count, summed across releases) count each user once for every day they opened the app. Weekly users = weekly checks ÷ average days of use per week, with the average measured during the beta.
3. 300 or more GitHub stars.
4. It comes up in job interviews and gets real questions.

### The January gate

At the end of week 17 (31 January 2027), answer one question honestly: did I use the app for my own reading on most days in January? A script in `scripts/` answers it from the sidecars, by counting the January days on which an annotation was created or updated. The gate passes at 20 of 31 days. If not, stop building features. Write down why, and decide whether to fix the reason, change the idea or shelve it. Packaging and launch only start after a yes.

A smaller check comes first, on Sunday 13 December (end of week 10): did I use the app on at least 3 days a week in weeks 7 to 10? If not, find out why before building fuzzy re-anchoring.

## Risks

| Risk                                                                          | What to do                                                                                                                                                                                      |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Selection-to-source mapping is harder than planned                            | Retired: week 3 finished on time with 19 fixture cases                                                                                                                                          |
| A semester week eats all the hours                                            | Weekly goals are small and planned at about 75% of the hours. Move one week, never skip the gate                                                                                                |
| Editing grows into a second product                                           | Edit mode is a one-week could-have: a source editor that re-anchors on save. If it runs over, ship "Open in editor" and move edit mode after launch. Live preview is out of scope for version 1 |
| Signing costs or Apple notarization take longer than expected                 | Apple enrolment and the Windows signing application start in week 17, a month before signing is built                                                                                           |
| Browser folder access only works in Chrome and Edge                           | Accepted. The web version is a demo; the desktop app is the product                                                                                                                             |
| A sidecar changed elsewhere (sync, `git pull`, another window) is overwritten | Re-read and merge before each save, atomic writes (week 4); reload when the sidecar changes on disk (week 6)                                                                                    |
| Bugs that only show on macOS, while development happens on Windows            | Run the release checklist on a Mac for every release from week 5; WebKit browser tests in CI from week 15                                                                                       |
| A name conflict turns up after public posts                                   | Trademark and domain check in week 4                                                                                                                                                            |

## Open decisions

- Domain and EUIPO trademark check for "mdgloss" (week 4).
- Windows signing route: SignPath Foundation or a paid certificate (week 17).
- Design and pricing of paid sync. Not needed before launch.
