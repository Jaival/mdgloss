# mdgloss — Design System

> Source of truth for UI decisions in mdgloss. Read this before building or changing any screen.
> Built on shadcn/ui preset [`b1NZnpTzRS`](https://ui.shadcn.com/create?preset=b1NZnpTzRS).

## 1. Setup

```bash
bunx --bun shadcn@latest init -p b1NZnpTzRS -t vite
bunx --bun shadcn@latest add button dialog dropdown-menu tooltip sidebar scroll-area popover command separator
```

To check what the preset contains at any time:

```bash
bunx --bun shadcn@latest preset decode b1NZnpTzRS
```

Do not hand-edit preset codes or build preset URLs manually. Use the CLI.

### Preset at a glance

| Setting        | Value                            |
| -------------- | -------------------------------- |
| Style          | `sera`                           |
| Base color     | `mist` (cool blue-grey neutrals) |
| Theme / accent | `cyan`                           |
| Chart colors   | `teal`                           |
| Body font      | Manrope                          |
| Heading font   | Figtree                          |
| Icons          | Lucide (`lucide-react`)          |
| Radius         | default — `0.625rem` (10px)      |
| Menu accent    | `subtle`                         |
| Menu color     | `default-translucent`            |

## 2. Design intent

mdgloss is a reading tool first. The UI should step back so the document leads.

- **Calm, cool, quiet.** Mist neutrals with a single cyan accent. The accent marks the current thing: active file, focused control, selected annotation. Nothing else.
- **Text is the hero.** Long-form readability beats density. Chrome (sidebars, toolbars) is lighter in weight and contrast than the document.
- **Annotations are the only loud color.** Highlights carry the user's meaning, so they get saturated color; the interface around them doesn't.
- **Desktop-native feel.** It runs in Tauri, so it should feel like an app, not a website: no hover-only affordances, no page-level scroll on the shell, keyboard-first.

## 3. Color tokens

All colors are OKLCH CSS variables set by the preset. **Use semantic tokens through Tailwind classes** (`bg-background`, `text-muted-foreground`, `border-border`). Never hard-code hex/oklch in components, and never write manual `dark:` color overrides. The tokens already swap in `.dark`.

### Core

| Token                | Light                        | Dark                         | Use for                        |
| -------------------- | ---------------------------- | ---------------------------- | ------------------------------ |
| `background`         | `oklch(1 0 0)`               | `oklch(0.148 0.004 228.8)`   | App + reading surface          |
| `foreground`         | `oklch(0.148 0.004 228.8)`   | `oklch(0.987 0.002 197.1)`   | Body text                      |
| `card`               | `oklch(1 0 0)`               | `oklch(0.218 0.008 223.9)`   | Comment cards, panels          |
| `popover`            | `oklch(1 0 0)`               | `oklch(0.218 0.008 223.9)`   | Menus, highlight toolbar       |
| `primary`            | `oklch(0.52 0.105 223.128)`  | `oklch(0.45 0.085 224.283)`  | Primary actions, active states |
| `primary-foreground` | `oklch(0.984 0.019 200.873)` | same                         | Text on primary                |
| `secondary`          | `oklch(0.967 0.001 286.375)` | `oklch(0.274 0.006 286.033)` | Secondary buttons              |
| `muted`              | `oklch(0.963 0.002 197.1)`   | `oklch(0.275 0.011 216.9)`   | Code blocks, subtle fills      |
| `muted-foreground`   | `oklch(0.56 0.021 213.5)`    | `oklch(0.723 0.014 214.4)`   | Metadata, timestamps, hints    |
| `accent`             | `oklch(0.963 0.002 197.1)`   | `oklch(0.275 0.011 216.9)`   | Hover/selected row bg          |
| `destructive`        | `oklch(0.577 0.245 27.325)`  | `oklch(0.704 0.191 22.216)`  | Delete annotation, errors      |
| `border`             | `oklch(0.925 0.005 214.3)`   | `oklch(1 0 0 / 10%)`         | Dividers, outlines             |
| `input`              | `oklch(0.925 0.005 214.3)`   | `oklch(1 0 0 / 15%)`         | Field borders                  |
| `ring`               | `oklch(0.723 0.014 214.4)`   | `oklch(0.56 0.021 213.5)`    | Focus rings                    |

### Sidebar

| Token                        | Light                        | Dark                         |
| ---------------------------- | ---------------------------- | ---------------------------- |
| `sidebar`                    | `oklch(0.987 0.002 197.1)`   | `oklch(0.218 0.008 223.9)`   |
| `sidebar-foreground`         | `oklch(0.148 0.004 228.8)`   | `oklch(0.987 0.002 197.1)`   |
| `sidebar-primary`            | `oklch(0.609 0.126 221.723)` | `oklch(0.715 0.143 215.221)` |
| `sidebar-primary-foreground` | `oklch(0.984 0.019 200.873)` | `oklch(0.302 0.056 229.695)` |
| `sidebar-accent`             | `oklch(0.963 0.002 197.1)`   | `oklch(0.275 0.011 216.9)`   |
| `sidebar-accent-foreground`  | `oklch(0.218 0.008 223.9)`   | `oklch(0.987 0.002 197.1)`   |
| `sidebar-border`             | `oklch(0.925 0.005 214.3)`   | `oklch(1 0 0 / 10%)`         |
| `sidebar-ring`               | `oklch(0.723 0.014 214.4)`   | `oklch(0.56 0.021 213.5)`    |

### Charts (teal ramp, same in both themes)

`chart-1` `oklch(0.855 0.138 181.071)` → `chart-2` `oklch(0.704 0.14 182.503)` → `chart-3` `oklch(0.6 0.118 184.704)` → `chart-4` `oklch(0.511 0.096 186.391)` → `chart-5` `oklch(0.437 0.078 188.216)`

Only relevant if mdgloss adds reading stats later.

### mdgloss extension: highlight colors

Not part of the preset. Add these to `src/index.css` alongside the preset vars. They are translucent so text stays readable in both themes, and they're picked to stay distinct from the cyan UI accent.

```css
:root {
  --highlight-yellow: oklch(0.93 0.16 95 / 55%);
  --highlight-green: oklch(0.88 0.14 150 / 50%);
  --highlight-pink: oklch(0.85 0.12 0 / 45%);
  --highlight-purple: oklch(0.82 0.1 300 / 45%);
}
.dark {
  --highlight-yellow: oklch(0.75 0.15 95 / 35%);
  --highlight-green: oklch(0.7 0.14 150 / 35%);
  --highlight-pink: oklch(0.68 0.15 0 / 35%);
  --highlight-purple: oklch(0.65 0.13 300 / 35%);
}
@theme inline {
  --color-highlight-yellow: var(--highlight-yellow);
  --color-highlight-green: var(--highlight-green);
  --color-highlight-pink: var(--highlight-pink);
  --color-highlight-purple: var(--highlight-purple);
}
```

Rules:

- Yellow is the default highlight.
- Four colors max. More colors means users stop remembering what each one means.
- Never use cyan for a highlight; it reads as UI selection.
- Color is never the only signal. A highlight with a comment also gets a small marker in the margin.

## 4. Typography

| Role      | Font              | Notes                                                        |
| --------- | ----------------- | ------------------------------------------------------------ |
| UI + body | **Manrope**       | Default `font-sans`                                          |
| Headings  | **Figtree**       | `font-heading`; used for document H1–H3 and panel titles     |
| Code      | System mono stack | `ui-monospace, "SF Mono", "Cascadia Code", Menlo, monospace` |

Fonts install as registry dependencies (`font-manrope`, `font-heading-figtree`). Bundle them locally for Tauri. The desktop app must work offline, so no Google Fonts CDN at runtime.

### Reading view scale

The document is set larger than the UI.

| Element                  | Size                      | Line height | Weight       |
| ------------------------ | ------------------------- | ----------- | ------------ |
| Body paragraph           | 17px (`text-[17px]`)      | 1.7         | 400          |
| H1                       | 32px                      | 1.2         | 700, Figtree |
| H2                       | 24px                      | 1.3         | 600, Figtree |
| H3                       | 20px                      | 1.4         | 600, Figtree |
| Inline code / code block | 14.5px                    | 1.6         | 400, mono    |
| Measure (line length)    | `--reader-measure` (68ch) |             |              |

### UI scale

| Element                      | Class                                |
| ---------------------------- | ------------------------------------ |
| Sidebar items, menus         | `text-sm`                            |
| Metadata, timestamps, counts | `text-xs text-muted-foreground`      |
| Panel titles                 | `text-sm font-heading font-semibold` |

### Reader tokens

The reading view (`src/markdown/markdown.css`) takes its body and heading fonts, size and measure only from these variables, set on `:root` in `src/index.css`. Code keeps the mono stack above. A font swap or a reader setting changes the token, not the reader styles.

| Token                   | Value                            | Use                                          |
| ----------------------- | -------------------------------- | -------------------------------------------- |
| `--font-reader`         | `"Manrope Variable", sans-serif` | Document body text                           |
| `--font-reader-heading` | `"Figtree Variable", sans-serif` | Document headings H1–H6                      |
| `--reader-size`         | `17px`                           | Body size; the heading scale derives from it |
| `--reader-measure`      | `68ch`                           | Line length of the text column               |

Today the reader values equal the UI fonts (`font-sans`, `font-heading`). They are separate tokens so the reading font can change without touching the UI.

Reading font size should be user-adjustable (S/M/L) later. That setting only changes `--reader-size`.

## 5. Layout

```
┌──────────┬─────────────────────────────────────────────┐
│ Sidebar  │  Header (breadcrumb · chips · actions)      │
│ Files    ├────────────────────────────────┬────────────┤
│ Outline  │                                │ ● card     │
│ Bookmarks│      Document (68ch)           │   card     │
│          │                                │ ●  margin  │
│ 260px    │   centered, scrolls with →     │  16rem     │
└──────────┴────────────────────────────────┴────────────┘
```

- Shell is `h-dvh overflow-hidden`; each pane scrolls on its own (`ScrollArea`).
- Left sidebar: shadcn `Sidebar`, collapsible to icons. `Tabs` for Files / Outline (Bookmarks later), hidden when collapsed. Files holds the folder tree. Outline lists the open file's headings, indented by depth, with the number of highlights in each heading's section (up to the next heading) as a badge. The heading in view is marked (`isActive` plus a 2px `primary` inset bar); a click scrolls the reader to it. Heading extraction lives in `src/markdown/headings.ts` so the command palette can list the same headings.
- Right margin (`src/margin/`): scrolls with the document. A comment card sits level with the first `mark` of its highlight; a highlight with no comment gets a dot in a narrow gutter at the margin's left edge instead. Cards (and dots) that would overlap are pushed down, 8px apart (2px for dots). The maths is `layoutMargin` in `src/margin/layout.ts`; `MarginNotes` measures the marks and boxes and re-lays them when the document changes and on any resize of the article, the margin or a card (window, sidebar, font or size, images, a card expanding).
- Notes panel: the full list (with "Text not found") in a right-hand `Sheet` (320px), opened at any width by the header's notes button or the palette. Picking a card or "Edit comment" closes the sheet.
- Document column is centered with generous side padding (`px-8 py-12` desktop).
- Below ~900px (56rem) of reader width, a container query on the reader, the margin is hidden and the notes `Sheet` is the way to the comments; commented highlights show the small comment marker inside the text column again. Below ~640px window width (web demo on phones), the sidebar also becomes a `Sheet`.
- Spacing follows Tailwind's 4px scale. Prefer `gap-*` on flex/grid over margins.

## 6. Radius and elevation

- Base radius `--radius: 0.625rem`. Use the derived tokens (`rounded-lg`, `rounded-md`, `rounded-sm`), not raw pixel values.
- Highlights use `rounded-sm` with a tiny horizontal padding (`px-0.5`), so they look marked rather than boxed.
- Elevation is light: borders before shadows. Popovers and the floating highlight toolbar get `shadow-md`; nothing else casts a shadow.
- Menus use the preset's translucent menu color with backdrop blur. Keep that; don't override menu backgrounds.

## 7. Icons

Lucide only (`lucide-react`). Default size `size-4` in UI, `size-3.5` in dense lists. Stroke stays at default.

Suggested mapping, so icons stay consistent:

| Concept             | Icon                         |
| ------------------- | ---------------------------- |
| Highlight           | `Highlighter`                |
| Comment             | `MessageSquare`              |
| Bookmark            | `Bookmark` / `BookmarkCheck` |
| Preview mode        | `BookOpen`                   |
| Edit mode           | `PencilLine`                 |
| Folder / file       | `Folder` / `FileText`        |
| Outline             | `ListTree`                   |
| Orphaned annotation | `Unlink`                     |
| Export              | `Download`                   |

## 8. Components and patterns

Use shadcn components before writing custom ones. Add with the CLI; don't copy from docs by hand.

**Header.** Sidebar toggle, then a breadcrumb: the folders from the open folder's name down to the file's parent in `text-muted-foreground`, and the file name in `font-medium` (a single file shows only its parent folder; the full path is the `title`). On the right, before the update, notes and theme buttons, two chips (`rounded-full bg-muted text-xs`): "N highlights" with `Highlighter`, and a muted "N not found" with `Unlink`, which opens the "Text not found" list in a `Popover`. Each chip shows only when its count is above zero.

**Floating highlight toolbar.** Appears above a text selection. `Popover`-styled container, four color swatches, a comment button, a bookmark button. Keyboard: `1`–`4` pick a color, `C` comments, `Esc` dismisses.

**Comment card.** In the notes panel: a `Card` with the quoted snippet (`text-xs text-muted-foreground`, left border in the highlight's color), comment body, timestamp, overflow menu (edit/delete). Selecting it scrolls the document to the anchor and pulses the highlight once.

**Margin card.** In the margin: no quote (the highlight is beside it), a 3px left border in the highlight's color, the comment clamped to 4 lines, the date, and the same overflow menu. A click expands or clamps the comment. The highlight being edited rings its card (or dot) in `primary`. A margin dot (`size-2`, the highlight's color) opens the highlight toolbar on its highlight.

**Orphaned annotations.** Shown in their own collapsible section at the bottom of the notes panel with the `Unlink` icon and a `muted` background. Never shown as errors; the text just moved.

**Mode switch.** Preview ↔ Edit is a two-option toggle in the toolbar. Edit mode (CodeMirror) uses the same background and mono font tokens so switching doesn't flash.

**Command palette.** `CommandDialog` on `Ctrl/Cmd+K` (`src/palette/`); the same keys close it. Groups in this order, empty groups hidden: **Headings** of the open file (indented by level), **Files** in the open folder (folder path on the right), **Notes** (the comment, or the quote when there is none, with a color dot), **Commands** (open file, open folder, toggle notes, theme with a check on the current one; focus mode joins them in UI plan step 6). Every word typed must appear in the label or its detail; matches at the start of the label rank first. Each group shows 50 items at most. Bookmarks join when they exist.

**Empty states.** Short sentence plus one action, or two when the sentence offers a choice (primary first, the other `outline`). Example: "Nothing open." `[Open folder]` `[Open file]`.

### Form rules

- Group fields with shadcn `Field` / `FieldGroup`; don't hand-roll label/input spacing.
- Every input has a visible label.

## 9. Interaction and motion

- Use `tw-animate-css` utilities (included by the preset). Keep durations 120–200ms, ease-out.
- Respect `prefers-reduced-motion`: no scroll pulse, instant panel open.
- Focus rings come from `ring`/`outline-ring/50` (set in the preset's base layer). Never remove focus outlines.
- Everything reachable by keyboard. Shortcuts shown in tooltips (`Tooltip` + `<kbd>`).
- No hover-only controls. Anything revealed on hover must also be reachable by focus.

## 10. Theming

- Light and dark both ship at launch. Default follows the OS.
- Theme is toggled by the `.dark` class on `<html>`.
- In Tauri, match the window title bar to `background` on theme change so there's no light bar over a dark app.
- A future "sepia" reading theme should be added as a third class that only overrides `background`, `foreground`, `muted`, and `border`. Don't fork components for it.

## 11. Accessibility

- Body text on `background` passes WCAG AA in both themes with the preset values. Don't put body text on `muted` at smaller than 14px.
- `muted-foreground` is for secondary info only, never for content the user must read to use the app.
- Highlights must keep text at AA contrast. If a new highlight color is added, check it against `foreground` in both themes.
- Icon-only buttons need `aria-label`.

## 12. Rules for AI coding agents

When generating UI for mdgloss:

1. Use semantic tokens (`bg-background`, `text-foreground`, `bg-primary`, `border-border`, `bg-highlight-yellow`). No raw colors.
2. No manual `dark:` color classes. Tokens handle dark mode.
3. Add shadcn components with `bunx --bun shadcn@latest add <name>`; check `components/ui` first to avoid duplicates.
4. Fonts: `font-sans` (Manrope) for UI and body, `font-heading` (Figtree) for headings.
5. Icons from `lucide-react` only, using the mapping in section 7.
6. Radius via `rounded-*` tokens only.
7. Use `Field`/`FieldGroup` for forms.
8. Document text stays within `max-w-[68ch]`.
9. No network-loaded fonts or assets in the desktop build.
10. Keyboard and focus support is part of "done", not a follow-up.
