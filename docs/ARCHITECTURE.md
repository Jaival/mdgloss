# Architecture

How mdgloss is put together, as of week 4 (October 2026). [SPEC.md](SPEC.md) says what the app should do and when. This file says how the code does it. Parts not built yet are marked _planned_.

## The rules everything follows

1. **The markdown file is never written by annotating.** Highlights, comments and bookmarks live elsewhere. Only edit mode (planned) writes markdown.
2. **Annotations point at the source, not the HTML.** A highlight stores markdown offsets and the quoted source text, so it survives theme changes, renderer upgrades and edits to the file.
3. **Local first.** No server, no account, no analytics.
4. **Documents are untrusted.** A reader opens files written by other people, inside an app that can read the disk.

## Overview

```
┌──────────────────────── Webview (React + TypeScript) ────────────────────────┐
│                                                                              │
│  App.tsx ── open dialogs, workspace, current document, links, theme          │
│    │                                                                         │
│    ├─ files/      tree of .md files          ◄── fs/ FileSystem interface    │
│    ├─ markdown/   source → HAST → React       (TauriFileSystem today;        │
│    ├─ selection/  DOM Range → source offsets   Browser/Demo planned)         │
│    └─ annotations/ sidecar paths (storage planned)                           │
│                                                                              │
└──────────────┬───────────────────────────────────────────────┬───────────────┘
               │ Tauri plugins (fs, dialog, opener)            │ invoke()
┌──────────────▼───────────────────────────────────────────────▼───────────────┐
│  Rust (src-tauri/src/lib.rs)                                                 │
│    plugin setup · allow_document_images command · fs and asset scopes        │
└──────────────────────────────────────────────────────────────────────────────┘
```

| Layer         | Technology                                                                           |
| ------------- | ------------------------------------------------------------------------------------ |
| Desktop shell | Tauri 2 with the fs, dialog and opener plugins                                       |
| UI            | React 19, TypeScript, Vite, Tailwind v4, shadcn/ui components (`src/components/ui/`) |
| Markdown      | unified: remark-parse, remark-gfm, remark-rehype, rehype-slug, rehype-highlight      |
| Tests         | Vitest (happy-dom for DOM tests), `cargo test`                                       |
| Planned       | CodeMirror 6 (edit mode), diff-match-patch (fuzzy re-anchoring)                      |

## Source layout

```
src/
  App.tsx              Shell: sidebar, toolbar, open file/folder, link handling
  main.tsx             React entry
  theme.ts             Light/dark/system, saved in localStorage
  fs/                  FileSystem interface, Tauri adapter, path helpers
  files/               Markdown file tree (loadMarkdownTree, FileTree)
  markdown/            Rendering pipeline, <Markdown>, links, Obsidian embeds
  selection/           Selection-to-source mapping (week 3)
  annotations/         Highlight model, file format, stores, toolbar (week 4)
  components/ui/       shadcn components, generated. Restyle through tokens, not edits
  index.css            Design tokens (see DESIGN.md)
src-tauri/
  src/lib.rs           Plugins, the allow_document_images command, Rust tests
  capabilities/        What the webview may call
  tauri.conf.json      App config, version, bundling
scripts/               Repo scripts (set-version.mjs)
docs/                  SPEC, DESIGN, ARCHITECTURE, DEVOPS, RELEASING
```

## File access

All file access goes through one interface ([`src/fs/types.ts`](../src/fs/types.ts)), so the rest of the app doesn't know whether it runs in Tauri or a browser:

```ts
interface FileSystem {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  listDir(path: string): Promise<Entry[]>;
  exists(path: string): Promise<boolean>;
  createDir(path: string): Promise<void>; // with parents
  watch(path: string, onChange: (event: ChangeEvent) => void): Unsubscribe;
  canWrite(path: string): Promise<boolean>;
}
```

| Adapter             | Status        | Backed by                                                                                                                    |
| ------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `TauriFileSystem`   | Done          | `@tauri-apps/plugin-fs`. Skips symlinks so a link to a parent folder can't loop the tree. `watch` debounces bursts by 300 ms |
| `BrowserFileSystem` | Planned (Mar) | File System Access API (Chrome, Edge)                                                                                        |
| `DemoFileSystem`    | Planned (Mar) | In-memory sample documents for the web demo                                                                                  |

Paths are absolute strings. [`src/fs/path.ts`](../src/fs/path.ts) handles both `/` and `\`, so the same helpers work on Windows.

The file tree ([`src/files/tree.ts`](../src/files/tree.ts)) lists `.md` and `.markdown` files recursively, hides dot-folders (`.git`, `.mdgloss`) and `node_modules`, drops folders with no markdown inside, and sorts folders first with natural order (`week2` before `week10`).

### Permissions

The webview can only reach files the user picked. That's enforced by Tauri, not by the frontend:

- [`capabilities/default.json`](../src-tauri/capabilities/default.json) allows the open dialog and a short list of fs calls (read/write text, read dir, stat, exists, mkdir, watch). There's no general shell or process access.
- The fs plugin's scope starts empty, apart from `$APPDATA/annotations` (fallback annotation storage). Picking a file in the dialog grants that file. Picking a folder grants it **recursively** (`recursive: true`); without that, subfolders couldn't be listed.
- Images are loaded through Tauri's asset protocol, which has its own scope, also empty at start. Opening a single file only grants that file, so a document's images wouldn't load. The Rust command `allow_document_images` fixes that:
  - it refuses documents the fs scope doesn't already allow
  - it grants only files with an image extension
  - it resolves Obsidian embeds (`![[name.png]]`) the way Obsidian does: next to the document, then anywhere in the vault (the nearest folder above that contains `.obsidian`), shallowest match first. The vault search skips hidden folders and `node_modules`, and stops after 100,000 entries

## Rendering pipeline

[`src/markdown/pipeline.ts`](../src/markdown/pipeline.ts):

```
markdown source
  → remark-parse            markdown → MDAST (every node keeps start/end offsets)
  → remark-gfm              tables, task lists, strikethrough, autolinks, footnotes
  → remarkWikiEmbeds        ![[image.png|300]] → image nodes with source ranges
  → remark-rehype           MDAST → HAST. Raw HTML in the markdown is dropped
  → rehypeSourceOffsets     data-source-start / data-source-end on every element
  → rehypeTextOffsets       data-text-start / data-text-end on every piece of text
  → rehype-slug             GitHub-style heading ids for #anchor links
  → rehype-highlight        syntax highlighting for fenced code with a language
  → applyHighlights         <mark> around highlighted text (separate memo, see Annotations)
  → toJsxRuntime            HAST → React elements (in <Markdown>)
```

- **No `innerHTML`.** The tree becomes React elements, and raw HTML in documents is dropped, so a document can't run scripts.
- `<Markdown>` gets platform behaviour through props: `resolveImageSrc` turns a src into a URL the webview can load (`convertFileSrc` on desktop), and `onLinkClick` decides what a click does. [`links.ts`](../src/markdown/links.ts) sorts links into anchors (scroll), external URLs (system browser), markdown files (open in mdgloss) and other files (show in Explorer/Finder).
- A missing image renders a visible "Image not found" placeholder that keeps its `data-source-*` attributes.
- `imageSources()` runs a cheaper copy of the pipeline without highlighting, to list a document's images before rendering so they can be granted first.

### Source offsets on the rendered HTML

Two kinds of attributes connect the HTML back to the markdown:

| Attribute                               | On                                 | Means                                                     |
| --------------------------------------- | ---------------------------------- | --------------------------------------------------------- |
| `data-source-start` / `data-source-end` | every element                      | The element's whole source, including syntax (`**bold**`) |
| `data-text-start` / `data-text-end`     | elements or `<span>`s holding text | Where the rendered text inside comes from (`bold`)        |

Text marking rules (`rehypeTextOffsets`):

- If a text is its element's only child, the element gets the attributes (`<em data-text-start=…>b</em>`).
- Mixed text is wrapped in a `<span>` that carries them.
- Code blocks are marked on `<code>` with the range **between the fences**, because highlighting replaces their text with `<span class="hljs-…">` pieces that have no positions.
- Text the renderer made up has no source and stays unmarked: footnote numbers, "↩" back-links, whitespace between table rows and list items.

## Selection mapping

[`src/selection/`](../src/selection/) answers: "the user selected this in the preview. What is it in the markdown?"

```ts
toSourceSelection(range: Range, root: Element, source: string)
  → { start, end, quote, prefix, suffix } | null
```

1. Collect the text nodes inside `root` that sit in a `[data-text-start]` element.
2. Move each end of the range to the nearest such text node, inward. That handles triple-click ranges that end on an element boundary, and ends that land on generated text.
3. For each end, count the rendered characters before it in its marked element, then align that element's text against its source range with `alignText` ([`align.ts`](../src/selection/align.ts)). Each rendered character is matched to the next equal source character. Skipped source characters are markup. Escapes (`\*`) and entities (`&copy;`) map as one unit. Inside code everything is literal.
4. Trim whitespace, then cut `quote = source.slice(start, end)` and 32 characters of `prefix` and `suffix`.

The quote is **source text**, so a selection across formatting includes the markers (`process* is a program in **execution`). That's deliberate: re-anchoring searches the source.

Offsets are UTF-16 code units, the same as the DOM and JavaScript strings.

## Annotations

Stored as JSON next to the markdown, never inside it:

```
os-course-notes/
  week1.md
  .mdgloss/
    week1.md.json      ← sidecarPath("os-course-notes/week1.md")
```

The full data model is in [SPEC.md](SPEC.md#data-model). Week 4 builds highlights; comments, bookmarks and `lastRead` follow.

### Storage

[`store.ts`](../src/annotations/store.ts) has one interface, `AnnotationStore` (`load`, `save`). The app uses `LocalAnnotationStore`, which combines two others:

| Store          | Where                                                                             | Used                                       |
| -------------- | --------------------------------------------------------------------------------- | ------------------------------------------ |
| `SidecarStore` | `.mdgloss/<name>.json` next to the file. Travels with git, Dropbox, OneDrive      | Always first, for single files and folders |
| `AppDataStore` | `$APPDATA/annotations/<sha256 of the absolute path>.json`, which records the path | When writing the sidecar fails             |

- **One home per file.** A file opened on its own and the same file opened through its folder use the same sidecar, so both show the same highlights. (The first build put single files in app storage, so the two ways of opening showed different highlights.)
- **Moving out of app storage.** On load, highlights found in app storage are shown alongside the sidecar's (deduplicated by id). The next successful sidecar save writes them all to the sidecar and empties the app-storage file (`"movedTo": "sidecar"`), so a highlight deleted later can't come back from there. Emptying instead of deleting avoids giving the webview an fs remove permission.
- `save` resolves to where the annotations went. The header shows a drive icon, with an explanation in its tooltip, when the last save fell back to app storage.
- **The `.mdgloss` grant.** A picked folder is granted as `folder/**`, but on macOS and Linux `**` doesn't match names starting with a dot. Before each sidecar access, the Rust command `allow_sidecar` grants the document's own `.mdgloss` folder. It refuses documents the fs scope doesn't already allow.
- **Never lose annotations.** [`format.ts`](../src/annotations/format.ts) refuses a file with broken JSON or a newer `schemaVersion`; the hook then shows the error and doesn't save, so the file is never overwritten. A single highlight it can't read is left out of the UI but written back unchanged. Fields not managed yet (`bookmarks`, `lastRead`, unknown keys) are kept.
- **Saves are queued** in [`useAnnotations`](../src/annotations/useAnnotations.ts), so they reach the disk in order. A failed save keeps the change on screen and shows the error in the header.
- The content-hash part of the fallback key (from the spec) isn't built: the hash would let annotations follow a moved file, which nothing uses yet.

### Highlights

1. Selecting text in the reader and releasing the mouse maps the range with `toSourceSelection` and opens the floating toolbar ([`HighlightToolbar.tsx`](../src/annotations/HighlightToolbar.tsx)) above it. Picking a colour (click, or `1`–`4`) saves a highlight with the quote, 32 characters of prefix and suffix, and the start offset.
2. Clicking a highlight opens the toolbar for it: change colour, or delete (`Del`). `Esc` closes it, and so does scrolling, because the toolbar is fixed to the window.
3. `placeHighlights` places a highlight only if its quote is still at its offset. Anything else stays in the file, unshown, until re-anchoring (week 6).
4. [`applyHighlights`](../src/markdown/highlights.ts) copies the rendered HAST and, for each element with `data-text-*`, aligns its text to the source with `alignText` (the same alignment selection mapping uses) and wraps highlighted characters in `<mark class="highlight highlight-<color>" data-highlight="<id>">`. A highlight across a bold word, list items, paragraphs, table cells or a code block becomes one mark per piece of text, so the HTML stays valid. Overlaps: the later highlight wins.

The marks are part of the React tree, not DOM edits after rendering, so React never fights over them, and the `data-text-*` attributes stay on their elements, so selections inside highlighted text still map. The pipeline result is memoized on the source and `applyHighlights` separately on the highlights, so changing a colour doesn't re-parse the document.

### Re-anchoring _(weeks 6 and 11)_

Runs when a file opens and whenever it changes:

1. Look for `prefix + quote + suffix` near the stored offset.
2. Search the whole file for the quote. Use prefix and suffix to choose between repeats.
3. _(Week 11)_ Fuzzy match with diff-match-patch. Above the threshold (about 0.8 to start), the highlight is placed with status `approximate` until the user confirms it.
4. Otherwise `orphaned`, listed at the bottom of the sidebar for re-attaching or deleting.

In edit mode, CodeMirror maps highlight positions through each change, so no search is needed until save.

## UI and design

- The shell is shadcn/ui on Tailwind v4: a collapsible sidebar with the file tree, and a toolbar with a theme menu. Tokens and type scale come from [DESIGN.md](DESIGN.md).
- The reader's font size is driven by a `--reader-size` CSS variable. Markdown styles are in `src/markdown/markdown.css`.
- Theme is `system`, `light` or `dark`, saved in `localStorage` under `mdgloss.theme`, applied as a `.dark` class on `<html>`.

## Testing

| Area                           | Where                                    | How                                                                                                    |
| ------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Pipeline and offsets           | `src/markdown/pipeline.test.ts`          | Render to static markup or HAST and compare source slices                                              |
| Selection mapping              | `src/selection/sourceSelection.test.ts`  | happy-dom, real `Range` objects, 19 numbered fixtures and a 20,000-line performance test               |
| Highlight rendering            | `src/markdown/highlights.test.ts`        | Select in happy-dom, save, re-render with marks: formatting, paragraphs, lists, code, tables, entities |
| Annotation format and stores   | `src/annotations/`                       | Round trips, unknown fields kept, refusals, in-memory `FileSystem` for both stores                     |
| Paths, links, tree, fs adapter | `src/fs/`, `src/markdown/`, `src/files/` | Pure unit tests                                                                                        |
| Rust                           | `src-tauri/src/lib.rs`                   | Image filtering, Obsidian resolution against a temporary vault, sidecar folder path                    |

## Known gaps and decisions

- **No Content Security Policy.** `tauri.conf.json` has `"csp": null`. Rendering is already safe (raw HTML dropped, no `innerHTML`), but a CSP would be a second line of defence. Set one before the public release. It has to allow the asset protocol for images.
- **Large documents re-render whole.** The pipeline runs on every source change. Fine for course notes; revisit if live reload (week 6) feels slow on big files.
- **Highlights aren't reachable by keyboard yet.** They open by click. The sidebar list in week 5 gives keyboard access.
- **Sidecar writes aren't atomic.** A crash mid-write could leave a broken file, which the app would then refuse to load (not overwrite). Write-then-rename needs the fs rename permission; add it if this ever happens.
- **Not built yet:** the browser and demo adapters, file watching in the UI, edit mode, export.
- **Linux** isn't a release target for version 1, though CI compiles and tests the Rust code on Linux.
