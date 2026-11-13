# Testing mdgloss on a Mac

Thanks for helping! mdgloss is a Markdown reader: you open `.md` files, highlight text and add comments, and the highlights are saved next to the file. It's an early test build, so things will break. That's the point.

This takes about 30 minutes. You don't need to know Markdown or code. Write down what you see as you go, and use the report template at the end.

## What you need

- A Mac (Apple Silicon or Intel; write down which in your report).
- The installer: `mdgloss_<version>_universal.dmg` from the release link I send you.
- The test files: download https://github.com/Jaival/mdgloss/archive/refs/heads/main.zip, unzip it, and copy the folder `docs/release-check` to your Desktop. Rename the copy to **`mdgloss check ö`** (the space and the `ö` are on purpose).

## 1. Install

1. Open the `.dmg` and drag mdgloss to Applications.
2. Open mdgloss from Applications. macOS will warn you, because the app isn't signed yet. **Write down the exact words of the warning.** Then get past it:
   - Right-click (or Control-click) the app, choose **Open**, then **Open** again.
   - If there is no Open button: go to **System Settings → Privacy & Security**, scroll down, click **Open Anyway** next to mdgloss.
   - If macOS says the app **"is damaged"**: open Terminal and run `xattr -dr com.apple.quarantine /Applications/mdgloss.app`, then open it again.
   - **Write down which of these worked.**
3. With mdgloss open, open **Activity Monitor**, find mdgloss and look at the **Kind** column. Write down whether it says **Apple** or **Intel**.
4. In Finder, right-click mdgloss in Applications → **Get Info**. Write down the version.

## 2. Open files

1. Click **Open folder** and pick `mdgloss check ö`. On the left you should see `lecture.md` and a `week2` folder with `notes.md` in it. Nothing else.
2. Click `week2/notes.md`. It should show formatted text.
3. Click `lecture.md`.

## 3. Does it look right? (`lecture.md`)

- Headings, **bold**, _italic_, a list, a table and a footnote all look normal.
- The code block has coloured text.
- `©` and `é` show as those letters, and `2 * 2 * 2` shows without backslashes.
- The logo shows twice (the second one small). A missing image shows an "Image not found" box.
- Links: **Back to the top** scrolls up. **The Tauri website** opens your browser. **Week 2 notes** opens that file in mdgloss. **The logo file** shows the file in Finder.
- Switch the theme (light / dark / system) with the button at the top. With **System**, change macOS between Light and Dark in System Settings: the app follows.

## 4. Highlights

1. Select some text with the mouse. A small toolbar appears: pick a colour. The text is now highlighted.
2. Try these selections, each one highlighted. Check that the highlight covers **exactly** what you selected, no more, no less:
   - A few words in the middle of a paragraph.
   - Text that crosses **bold** or _italic_ words.
   - From the end of one list item to the start of the next.
   - Across two cells of the table.
   - A few words in the code block.
   - Triple-click a paragraph and highlight it.
3. Click a highlight. Press `1`, `2`, `3`, `4` to change its colour. Press `Delete` to remove one. Press `Esc` to close the toolbar.
4. Open `week2/notes.md` and highlight something there too.
5. In Finder, the `mdgloss check ö` folder should now have a hidden `.mdgloss` folder (press `Cmd+Shift+.` to show hidden files). So should `week2`.

## 5. Comments and notes

1. Click a highlight and press `C` (or the comment button). Type a comment and press `Cmd+Enter`.
2. The highlight gets a small comment mark in the right margin.
3. Select new text and press `C` right away: you can comment, and it becomes a yellow highlight.
4. Open the notes panel from the button at the top. It lists your highlights in order. Click one: the page scrolls to it. Use its menu to edit a comment and to delete a highlight.

## 6. Does it remember?

1. Quit mdgloss (`Cmd+Q`) and open it again. Open the folder again. All highlights and comments are still there.
2. Open a second window: in Terminal run `open -n -a mdgloss`. Open `lecture.md` in both windows. Add a highlight in one, then a different one in the other. Both windows should end up showing both.

## 7. Changes from outside the app

Open `lecture.md` in another editor (TextEdit works: right-click the file → **Open With → TextEdit**), with mdgloss showing the same file.

1. Add a new line of text near the top, above one of your highlights, and save. mdgloss should update by itself, and the highlight should stay on the same words.
2. Change a word inside a highlighted bit and save. That highlight should move to a **"Text not found"** section at the bottom of the notes panel. Undo the change and save: it comes back.
3. In Finder, add a new file `test.md` to the folder, rename it, then delete it. The list on the left should follow each step.

## 8. Last test (deletes your highlights)

1. Quit mdgloss. Delete the hidden `.mdgloss` folder inside `mdgloss check ö`.
2. In Terminal, make the folder read-only: `chmod a-w ~/Desktop/"mdgloss check ö"`
3. Open mdgloss, open `lecture.md`, add a highlight. It should still work, and an icon at the top should say the highlights are stored in the app instead.
4. Undo the read-only: `chmod u+w ~/Desktop/"mdgloss check ö"`
5. Quit, open mdgloss again, open `lecture.md`, add another highlight. The icon should be gone and both highlights should be there.

## Report template

Copy this, fill it in and send it back. Screenshots help a lot (`Cmd+Shift+4`).

```
Mac model / chip:
macOS version:
mdgloss version (Get Info):

Install
- Warning text:
- What got me past it:
- Activity Monitor Kind (Apple / Intel):

Problems (section number, what I did, what I expected, what happened):
1.
2.

Anything confusing or annoying, even if it worked:
```
