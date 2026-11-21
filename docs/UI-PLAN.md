# UI plan: margin notes, with a focus mode

Decided 11 November 2026. Mockups: [`mockups/ui-directions.html`](mockups/ui-directions.html).

## Direction

- **Default mode ("Annotate")**: mockup A. Comments sit in the right margin beside their highlights; there is no notes panel to open.
- **From mockup C**: Files / Outline tabs in the sidebar, and the `Ctrl/Cmd+K` command palette.
- **Focus mode**: mockup B, as a mode the reader switches into, not a separate app layout.
- **Fonts**: to be supplied later. Build every font choice on a CSS variable so the swap is a token change.

## The two modes

|            | Annotate (default)                     | Focus                                                             |
| ---------- | -------------------------------------- | ----------------------------------------------------------------- |
| Sidebar    | Files / Outline tabs                   | Hidden                                                            |
| Header     | Breadcrumb, highlight and orphan chips | Hidden; a file-name pill top left opens the palette               |
| Comments   | Cards in the right margin              | Hidden; highlights stay, a "N notes" pill opens them in a `Sheet` |
| Extras     | —                                      | Progress line, time left, highlight ticks on the right edge       |
| Navigation | Sidebar, palette                       | Palette only                                                      |

- Switch: a header button (`BookOpen`), `Ctrl/Cmd+.`, and a palette command. `Esc` leaves focus mode when nothing else is open.
- Highlighting and commenting work the same in both modes. A comment written in focus mode uses the existing popover.
- The mode is remembered across restarts, next to the last opened folder.
- Focus mode is orthogonal to the theme. Sepia is a third theme (DESIGN.md section 10), usable in either mode.

## Steps (one PR each, stacked)

1. **Tokens.** `--font-reader`, `--font-reader-heading`, `--reader-size`, `--reader-measure` in `index.css`; `markdown.css` reads them. No visual change. Makes the later font swap one edit.
2. **Header.** Breadcrumb (folder / file) in place of the full path; highlight count chip; orphan chip that opens the "Text not found" list in a popover.
3. **Sidebar tabs.** Files and Outline. Outline lists the document's headings with a note count each, marks the heading in view, and scrolls on click.
4. **Margin notes.** Comment cards placed beside their highlights. Highlights with no comment get a margin dot. Below ~900px the margin collapses and the current `NotesPanel` shows as a `Sheet`.
5. **Command palette.** `Ctrl/Cmd+K`: files, headings, notes, and commands (theme, mode).
6. **Focus mode.** Mode state and switch, hidden chrome, pills, progress line, highlight ticks, notes `Sheet`.
7. **Sepia theme.** Third theme class overriding `background`, `foreground`, `muted`, `border`.
8. **Fonts.** Bundle the supplied fonts and point the tokens at them. Blocked on the fonts.
9. **Docs.** Update DESIGN.md sections 4, 5, 8 and 10 as each step lands, not at the end.

Steps 1 to 3 and 5 are independent of each other. Step 6 needs 4 (the `Sheet` fallback) and 5 (the palette is its only navigation).

## Risks

- **Margin card placement (step 4)** is the hard part. Cards are positioned from each highlight's first `mark` rect and pushed down when they would overlap, and must be re-laid on resize, reload, and font-size change. Put the layout maths in a pure function with tests; the DOM measuring stays thin.
- **Long comments** next to dense highlights push later cards far from their text. Clamp cards to a few lines; expand on click.
- **Focus mode with a folder open** depends fully on the palette. Do not ship step 6 before step 5.

## Open decisions

- Where this goes in the sprint plan. It replaces or absorbs the week 8 "notes shortcut" item; the rest is unscheduled.
- Whether the serif reading font belongs to focus mode only or is a separate reader setting. Decide when the fonts arrive.
- Mockup D (review desk across a folder) is not planned. Revisit after export exists.

## Closes from HANDOFF.md

- Orphans are easy to miss (header chip, step 2).
- Notes panel `Sheet` below ~900px (step 4).
- No notes shortcut (step 6: `N` in focus mode; margin notes need none).
