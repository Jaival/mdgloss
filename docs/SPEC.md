# mdgloss project spec

Version 1.1 of this spec, 30 September 2026. The project name is mdgloss.

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
- Edit mode: files open in preview; a button or Ctrl/Cmd+E switches to a CodeMirror source editor. Highlights stay visible in edit mode.
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
| CI/CD            | GitHub Actions                                      |
| Web demo hosting | GitHub Pages or Cloudflare Pages                    |

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

Hybrid. When a folder is opened and is writable, annotations go into a hidden sidecar folder:

```
os-course-notes/
  week1.md
  week2.md
  .mdgloss/
    week1.md.json
```

For single files or read-only locations, annotations go into the app's own storage (app data directory on desktop, IndexedDB on the web), keyed by absolute path plus a content hash. The UI shows a small indicator when a file uses this fallback.

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

In edit mode, CodeMirror maps every highlight position through each change as the user types, so no searching is needed until the file is saved.

## Platforms and distribution

- Windows and macOS builds from GitHub Actions on every tagged release.
- macOS: Developer ID signing and notarization (Apple Developer Program, about $99 a year).
- Windows: code signing certificate or a signing service. Compare prices before March.
- Auto-update through the Tauri updater, with the manifest hosted on GitHub Releases. Its download count is the weekly-usage proxy.
- The alpha is an unsigned local build for personal use only.

## Plan

Budget: 5 to 10 hours a week. The alpha date requires close to 9 hours a week through November. If a week goes badly, cut from the "stretch" items first, then move the alpha by one week rather than skipping tests.

### Phase 1: personal alpha (ends Sunday 29 November 2026)

| Week | Dates          | Goal                   | Done when                                                                                                                                                                         |
| ---- | -------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | 30 Sep – 4 Oct | Setup                  | Name picked (mdgloss), repo public with MIT licence, Tauri 2 + React + TS + Vite scaffold runs, ESLint and Prettier set up, GitHub Actions runs typecheck and tests on every push |
| 1    | 5 – 11 Oct     | Files                  | `FileSystem` interface and Tauri adapter, open file and open folder dialogs, file tree listing `.md` files                                                                        |
| 2    | 12 – 18 Oct    | Rendering              | remark/rehype pipeline with GFM, code highlighting, relative images; source offsets on elements; readable layout, light and dark theme                                            |
| 3    | 19 – 25 Oct    | Selection mapping      | Selection in preview converts to source offsets and a quote/prefix/suffix; unit tests on at least 10 fixture cases                                                                |
| 4    | 26 Oct – 1 Nov | Highlights and storage | Highlights render across element boundaries, colours, delete; sidecar read/write with `schemaVersion`; fallback storage for single files                                          |
| 5    | 2 – 8 Nov      | Comments and sidebar   | Comment popover on highlights; sidebar lists the current file's highlights; click to scroll                                                                                       |
| 6    | 9 – 15 Nov     | Live reload            | File watching, re-render on change, exact re-anchoring (steps 1 and 2); anything unmatched goes to a simple orphaned list; tests with edited fixtures                             |
| 7    | 16 – 22 Nov    | Dogfood                | Use it on real course material every day; fix what breaks; keyboard shortcuts; remember last opened folder                                                                        |
| 8    | 23 – 29 Nov    | Alpha                  | Buffer week. Tag `v0.1.0-alpha`, install the build on your own machine, write down the 10 most annoying problems                                                                  |

Moved out of the alpha to make November possible: bookmarks, last-read position, fuzzy matching, edit mode and export. They follow in December and January.

### Phase 2: complete the features (30 November 2026 – 31 January 2027)

| Week  | Dates           | Goal               | Done when                                                                                                                       |
| ----- | --------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| 9–10  | 30 Nov – 13 Dec | Bookmarks          | File, heading and position bookmarks; bookmarks panel for the whole folder; automatic last-read position                        |
| 11    | 14 – 20 Dec     | Fuzzy re-anchoring | diff-match-patch step, `approximate` status with a confirm action, orphaned section with re-attach                              |
| 12–13 | 21 Dec – 3 Jan  | Holidays           | Light weeks. Keep using the app, fix small bugs only                                                                            |
| 14–15 | 4 – 17 Jan      | Edit mode          | CodeMirror source editor behind a button and Ctrl/Cmd+E, save to disk, highlights shown as decorations and mapped through edits |
| 16    | 18 – 24 Jan     | Export             | Markdown export for one file and a whole folder, grouped by heading; copy to clipboard                                          |
| 17    | 25 – 31 Jan     | Gate check         | See "The January gate" below                                                                                                    |

### Phase 3: exams (February 2027)

Weeks 18 to 21, 1 to 28 February. Adjust these dates to your real exam period. Two to three hours a week at most: write tests for the re-anchoring code, start the README, collect screenshots. No new features.

### Phase 4: ship (1 March – 18 April 2027)

| Week  | Dates          | Goal              | Done when                                                                                                                                       |
| ----- | -------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 22–23 | 1 – 14 Mar     | Packaging         | GitHub Actions builds signed Windows (NSIS or MSI) and macOS (universal DMG, notarized) on each tag; Tauri updater working from GitHub Releases |
| 24–25 | 15 – 28 Mar    | Web demo          | `BrowserFileSystem` adapter, single-file fallback for Safari and Firefox, `DemoFileSystem` with 3 to 4 pre-annotated sample docs, deployed      |
| 26    | 29 Mar – 4 Apr | Launch material   | README with a demo GIF, short landing page, private beta with 5 to 10 people (classmates and developer friends)                                 |
| 27    | 5 – 11 Apr     | Release candidate | Fix beta feedback, write the Show HN post, tag `v1.0.0`                                                                                         |
| 28    | 12 – 18 Apr    | Launch            | Post on Tuesday 13 April: Show HN, then Reddit and LinkedIn. Spend the week answering comments and fixing urgent bugs                           |

## Success criteria

Measured on 13 July 2027, three months after launch, in this order of importance:

1. I use it daily for my studies from January 2027.
2. 50 or more weekly users, estimated from update checks.
3. 300 or more GitHub stars.
4. It comes up in job interviews and gets real questions.

### The January gate

At the end of week 17 (31 January 2027), answer one question honestly: did I use the app for my own reading on most days in January? If not, stop building features. Write down why, and decide whether to fix the reason, change the idea or shelve it. Packaging and launch only start after a yes.

## Risks

| Risk                                                          | What to do                                                                                                      |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Selection-to-source mapping is harder than planned            | It has its own week (week 3) and the alpha has a buffer week. If it overruns, cut week 7's shortcuts, not tests |
| A semester week eats all the hours                            | Weekly goals are small on purpose. Move one week, never skip the gate                                           |
| Editing grows into a second product                           | Edit mode stays a source editor. Live preview is out of scope for version 1                                     |
| Signing costs or Apple notarization take longer than expected | Start the Apple Developer enrolment in February, not March                                                      |
| Browser folder access only works in Chrome and Edge           | Accepted. The web version is a demo; the desktop app is the product                                             |

## Open decisions

- Domain and EUIPO trademark check for "mdgloss".
- Design and pricing of paid sync. Not needed before launch.
- Real exam dates for February and March 2027.
