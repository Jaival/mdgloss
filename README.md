<p align="center">
  <img src="docs/logo.svg" alt="mdgloss logo" width="128" height="128">
</p>

# mdgloss

A reader-first markdown app for Windows, macOS and the web. Open any markdown file or folder, then highlight, comment and bookmark as you read. Your markdown files are never changed: annotations live in a small `.mdgloss/` folder next to them, so they travel with the folder through git or Dropbox.

> **Status:** pre-alpha. A personal alpha is planned for 29 November 2026 and a public release for April 2027. The week-by-week plan is in [docs/SPEC.md](docs/SPEC.md).

## Why

Markdown apps are built for writing. Reading someone else's docs, course notes or specs, and marking up what matters, still means editing the file or keeping notes somewhere else. mdgloss treats markdown like a PDF you can annotate, without touching the source.

## Planned for version 1

- Open a file or a folder, with a file tree
- Highlights in several colours, with comments
- Bookmarks for a file, a heading or a spot in the text, plus automatic last-read position
- Live reload when a file changes on disk; highlights re-anchor to the moved text
- A source editor (CodeMirror) behind a toggle; files open in reading mode
- Export all annotations as a markdown summary
- Desktop apps for Windows and macOS, plus a web demo

## How annotations are stored

```
os-course-notes/
  week1.md
  .mdgloss/
    week1.md.json
```

Each highlight stores the quoted text with a few characters of context on either side, so it can be found again after the file is edited. This is the same approach the W3C Web Annotation model uses. If a highlight can't be placed, it moves to an "orphaned" list. mdgloss never deletes an annotation on its own.

## Development

Requirements: [Bun](https://bun.sh) (version pinned in `package.json`), Node.js 22 or newer (Vitest and some tools run on Node), Rust stable, and the [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS.

```bash
bun install
bun run tauri dev      # desktop app with hot reload
bun run dev            # frontend only, in the browser
```

Checks (the same ones CI runs):

```bash
bun run format:check
bun run lint
bun run typecheck
bun run test           # not "bun test", which skips Vitest
```

Stack: Tauri 2, React, TypeScript, Vite, Bun, with remark and rehype for rendering. CodeMirror 6 and diff-match-patch come in later milestones.

## License

[MIT](LICENSE)
