# Releasing mdgloss

How to cut a release, where the version lives, and what to do when a release goes wrong. For CI, secrets and dependency updates, see [DEVOPS.md](DEVOPS.md).

## What a release is today

Pushing a tag that starts with `v` runs [`.github/workflows/release.yml`](../.github/workflows/release.yml):

1. **Check tag matches app version** (Ubuntu, a few seconds). Reads the version from `package.json`, `src-tauri/tauri.conf.json` and `src-tauri/Cargo.toml`. If any of them differs from the tag, the release stops here.
2. **Create draft release** (Ubuntu, a few seconds). Creates a **draft release** with GitHub's generated notes: the PRs merged since the previous tag, with dependency bumps in their own section (sections are set in [`.github/release.yml`](../.github/release.yml)). The install warning at the top comes from [`.github/release-header.md`](../.github/release-header.md).
3. **Build** (macOS and Windows in parallel). [`tauri-action`](https://github.com/tauri-apps/tauri-action) builds the app and uploads the installers to that draft. With a warm Rust cache this takes about 4–5 minutes; with a cold one, about 10.

Nobody sees the draft until you publish it.

### Why the cache is warmed from `main`

A tag run can restore Rust caches saved on `main`, but not caches saved by another tag. So the same workflow also runs on pushes to `main` that change `Cargo.lock`, `Cargo.toml` or `release.yml`, every Monday, and on demand (`gh workflow run Release`). Those runs build both platforms with `--no-bundle`, upload nothing and save the cache. Tag runs only restore it. If a release is slow, check that the last warm-up run on `main` passed, or start one before tagging.

| Platform | Files                                                                                       |
| -------- | ------------------------------------------------------------------------------------------- |
| Windows  | `mdgloss_<version>_x64-setup.exe` (NSIS), `mdgloss_<version>_x64_en-US.msi`                 |
| macOS    | `mdgloss_<version>_universal.dmg` (Apple Silicon and Intel), `mdgloss_universal.app.tar.gz` |

The builds are **unsigned** until March 2027 (see [Signing](#signing-march-2027)). Windows SmartScreen and macOS Gatekeeper warn before opening them, and the release notes say how to get past the warning.

Installer file names come from the version in `tauri.conf.json`, **not** from the tag. That's why the versions have to match: the v0.0.2 release went out with `mdgloss_0.1.0_*` files before the check existed.

## Where the version lives

| File                        | Field                              | Used for                                 |
| --------------------------- | ---------------------------------- | ---------------------------------------- |
| `package.json`              | `"version"`                        | The frontend package                     |
| `src-tauri/tauri.conf.json` | `"version"`                        | App version, installer names, About info |
| `src-tauri/Cargo.toml`      | `version` under `[package]`        | The Rust crate                           |
| `src-tauri/Cargo.lock`      | `version` of the `mdgloss` package | Follows Cargo.toml                       |

Don't edit them by hand. Run:

```bash
bun run version:set 0.0.3
```

[`scripts/set-version.mjs`](../scripts/set-version.mjs) updates all four files. It refuses versions the Windows installer can't build (see below). Running it again with the same version changes nothing.

## Choosing a version

mdgloss uses [semantic versioning](https://semver.org) with a leading `v` on tags (`v0.0.3`).

| Stage                           | Versions | Example tags       |
| ------------------------------- | -------- | ------------------ |
| Pre-alpha, weekly builds        | `0.0.x`  | `v0.0.3`, `v0.0.4` |
| Personal alpha (29 Nov 2026)    | `0.1.0`  | `v0.1.0`           |
| Feature work and beta (Dec–Apr) | `0.x.y`  | `v0.2.0`, `v0.2.1` |
| Public launch (13 Apr 2027)     | `1.0.0`  | `v1.0.0`           |

Bump the patch number for fixes and weekly builds, and the minor number for a milestone. Every version you tag must be higher than the last one, or the auto-updater (week 7) won't offer it.

### The Windows installer's version rules

The `.msi` build is stricter than semver:

- Major and minor go up to **255**, patch up to **65,535**.
- A pre-release part must be **numbers only**. `0.1.0-1` works. `0.1.0-alpha` fails the Windows build.

That's why the spec tags the alpha `v0.1.0` and calls it the alpha in the release title and notes. Nothing is public yet, so the version number doesn't have to say "alpha".

If a version ever needs a text pre-release part, add an MSI-only version to `tauri.conf.json`:

```json
"bundle": { "windows": { "wix": { "version": "0.1.0" } } }
```

This field has to be updated by hand for every pre-release, and `version:set` refuses non-numeric pre-releases, so you'd edit the files yourself.

## Cutting a release, step by step

1. **Start from a green `main`.** Everything you want in the release is merged and CI has passed on `main`.

   ```bash
   git switch main && git pull
   ```

2. **Bump the version on a branch and merge it.** `main` has no branch protection, but go through a PR anyway so CI runs on it.

   ```bash
   git switch -c chore/release-0.0.3
   bun run version:set 0.0.3
   git commit -am "Release 0.0.3"
   git push -u origin chore/release-0.0.3
   gh pr create --base main --fill
   ```

   Merge the PR once CI passes, then update your local `main`.

3. **Tag the merge commit on `main` and push the tag.**

   ```bash
   git switch main && git pull
   git tag -a v0.0.3 -m "mdgloss 0.0.3"
   git push origin v0.0.3
   ```

4. **Watch the workflow.**

   ```bash
   gh run watch $(gh run list --workflow Release --limit 1 --json databaseId --jq '.[0].databaseId')
   ```

5. **Test the installers before publishing.** Download them from the draft (`gh release download v0.0.3 --dir /tmp/mdgloss-0.0.3`) and run the [release checklist](#release-checklist) on Windows, and from week 5 on a Mac too.

6. **Review and publish the draft.** The notes already list the merged PRs. Tidy them if needed, for example by removing the "Release 0.0.3" PR or adding a summary at the top (`gh release view v0.0.3 --web`). Leave **pre-release** unticked and **Set as the latest release** ticked: GitHub never makes a pre-release the latest release, so it wouldn't appear in the repo's Releases box and the updater wouldn't see it. The pre-alpha warning in the notes and the README's pre-release badge say what stage the app is at. Publishing makes the release visible, and once the updater is in (week 7) it also sends the update to installed copies.

7. **Note it in the build log** (`notes/linkedin-log.md`).

## Release checklist

Run this on the installers from the draft release, not on `bun run tauri dev`: it checks what users get, including the installer, the fs scopes and the bundled WebView. It takes about 20 minutes per platform. Windows for every release; macOS for every release from week 5 (spec risk: bugs that only show on macOS).

Open an issue for anything that fails. A failure under **Install** or **Annotations** blocks publishing; a rendering glitch can ship if it's noted in the release notes.

### Setup

1. Copy [`release-check/`](release-check/) out of the repo to a folder whose path has a space and a non-ASCII letter, such as `Desktop/mdgloss check ö/`. Opening it inside the repo would write a `.mdgloss` folder into your working tree. On a Mac without a clone, download the folder from GitHub (`gh repo clone Jaival/mdgloss` or the "Download ZIP" button).
2. Remove the copy's `.mdgloss` folder if it's left over from a previous run.
3. Know where app storage is:
   - Windows: `%APPDATA%\dev.mdgloss.app\annotations`
   - macOS: `~/Library/Application Support/dev.mdgloss.app/annotations`

### Install (both platforms)

- [ ] The installer file names carry the release's version (`mdgloss_0.0.3_…`).
- [ ] The OS warning appears and the steps in [`.github/release-header.md`](../.github/release-header.md) get past it. If they don't, write down what did and update the header before publishing.
- [ ] The app starts, and the OS shows the new version (Windows: **Settings → Apps → Installed apps**; macOS: **Get Info** on the app).

**Windows only**

- [ ] The `.exe` (NSIS) installs and starts from the Start menu. For a minor release (`0.x.0`), uninstall and try the `.msi` too.

**macOS only**

- [ ] The `.dmg` opens, and dragging mdgloss to Applications works. On Apple Silicon it runs natively (**Activity Monitor → Kind: Apple**), not under Rosetta.
- [ ] If macOS says the app "is damaged", the build isn't signed even ad hoc. `xattr -dr com.apple.quarantine /Applications/mdgloss.app` gets past it for testing; note it in the release notes and the handoff.

### Opening files

- [ ] **Open folder** on the copied folder: the tree shows `lecture.md` and `week2/notes.md`, folders first, and no `.mdgloss` folder.
- [ ] `week2/notes.md` opens and renders (the folder grant reaches subfolders).
- [ ] Restart the app, then **Open file** on `lecture.md` alone: it renders and its images load.

### Rendering (`lecture.md`)

- [ ] Headings, bold, italic, the list, the table and the footnote look right in light and dark theme. **System** theme follows the OS setting when you switch it.
- [ ] The C code block is syntax-highlighted.
- [ ] `©` and `é` show as characters, and `2 * 2 * 2` shows without backslashes.
- [ ] Images: the logo shows twice (the second, the `![[…]]` embed, 64 px wide), and `missing.png` shows the "Image not found" placeholder.
- [ ] Links: **Back to the top** scrolls up, **The Tauri website** opens the system browser, **Week 2 notes** opens that file in mdgloss, **The logo file** shows the file in Explorer/Finder.

### Selections and highlights

Make each selection by dragging with the mouse, pick a colour, then check the `quote` in `.mdgloss/lecture.md.json` (shown below as it appears in the JSON). The quote is the markdown source, so it keeps the markup.

| Select in the reader                                             | Expected `quote`                                               |
| ---------------------------------------------------------------- | -------------------------------------------------------------- |
| `process is a program in execution`                              | `process_ is a program in **execution`                         |
| `2 * 2 * 2`                                                      | `2 \* 2 \* 2`                                                  |
| `© 2026 and café`                                                | `&copy; 2026 and caf&eacute;`                                  |
| From `program counter and the open files.` to `A context switch` | `program counter and the open files.\n- A context switch`      |
| From `Waiting for a CPU` (Ready row) to `Running`                | `Waiting for a CPU`, the cell's padding, then `\|\n\| Running` |
| `fork();` in the code block                                      | `fork();`                                                      |

- [ ] Every row gives its expected quote, and each highlight shows over exactly the selected text (the list and table ones as one mark per piece).
- [ ] Triple-click a paragraph and highlight it: the mark covers the paragraph and nothing after it.
- [ ] Click a highlight: change its colour with `1`–`4`, then delete one with `Del`. `Esc` and scrolling close the toolbar.
- [ ] Highlight something in `week2/notes.md`: `week2/.mdgloss/notes.md.json` is created. On macOS this is the `.mdgloss` grant, which the folder's `**` scope doesn't cover.

### Annotations

- [ ] Restart the app and reopen the folder: every highlight is back. Open `lecture.md` with **Open file**: the same highlights show.
- [ ] No `.json.tmp` file is left in either `.mdgloss` folder.
- [ ] **Two windows.** Start a second copy of the app (Windows: launch it again from the Start menu; macOS: `open -n -a mdgloss`) and open `lecture.md` in both. Add a highlight in the first, then a different one in the second. The second shows both after its save; the first shows both after its next change. Restart: both are still there.
- [ ] **Fallback storage** (last, because it deletes the highlights so far). Quit the app, delete the top-level `.mdgloss` folder, and take away write access to the copied folder:
  - Windows (PowerShell): `icacls "<folder>" /deny "${env:USERNAME}:(WD,AD)"`, undo with `icacls "<folder>" /remove:d $env:USERNAME`
  - macOS: `chmod a-w "<folder>"`, undo with `chmod u+w "<folder>"`

  Open `lecture.md` and add a highlight: the header shows the app-storage icon, and a new file appears in app storage. Give write access back, restart, open `lecture.md` and add another highlight: both are now in `.mdgloss/lecture.md.json`, the icon is gone, and the app-storage file says `"movedTo": "sidecar"` with no highlights.

## When something goes wrong

**The check job fails ("Tag v0.0.3 but package.json says '0.0.2'").** Nothing was built or uploaded. Delete the tag, fix the version through a PR, and tag again:

```bash
git push origin :refs/tags/v0.0.3   # remote
git tag -d v0.0.3                   # local
```

**You pushed a tag by mistake.** Cancel the run (`gh run cancel <id>`), delete the tag as above, and delete any draft release it made (`gh release delete v0.1.1 --yes`). A stray `v0.1.1` was pushed on 9 Oct; it's gone from GitHub, so delete your local copy if you still have it (`git tag -d v0.1.1`).

**One platform fails to build.** The matrix uses `fail-fast: false`, so the other platform still uploads. Fix the problem on `main`, then either re-run the failed job (`gh run rerun <id> --failed`) if nothing in the code changed, or release the fix as the next patch version.

**A published release is broken.** Don't move or reuse a tag that's been published: anyone who downloaded it has that version. Release a fixed patch version and mark the bad release as broken in its notes, or delete it if nobody depends on it yet.

## Coming next

### Auto-update (week 7, 16–22 Nov 2026)

The Tauri updater checks GitHub Releases for a newer version. Its download count is the spec's measure of weekly users. Setup, once:

1. Generate the updater key pair. This key is free and separate from OS code signing.

   ```bash
   bunx tauri signer generate -w ~/.tauri/mdgloss.key
   ```

   Keep `~/.tauri/mdgloss.key` and its password out of the repo, and back them up in a password manager. **If you lose the private key, installed copies can never be updated again** and users have to reinstall by hand.

2. Add the private key and its password as repository secrets `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, and pass them to `tauri-action` as `env` in `release.yml`.
3. In `tauri.conf.json`, set `bundle.createUpdaterArtifacts: true` and add `plugins.updater` with the **public** key and the endpoint `https://github.com/Jaival/mdgloss/releases/latest/download/latest.json`.
4. Add `tauri-plugin-updater` on the Rust side and `@tauri-apps/plugin-updater` on the frontend, with the `updater:default` permission in `capabilities/default.json`.

`tauri-action` then uploads signed update bundles and a `latest.json` with every release.

Things to know before relying on it:

- `releases/latest` skips drafts **and pre-releases**. That's why releases are published as normal releases from v0.0.3 on (v0.0.1 and v0.0.2 stay marked pre-release). Don't tick pre-release on a release the updater should offer.
- The updater compares versions as semver. It never offers a lower version, so don't go back down after a mistake.

### Signing (March 2027)

- **macOS:** Apple Developer Program (about $99 a year), a Developer ID Application certificate, and notarization. Enrol in late January (week 17): approval can take a while.
- **Windows:** a code signing certificate or a signing service. Apply to the SignPath Foundation (free for open-source projects) in week 17, with a paid certificate as the fallback.

Both go into `release.yml` as secrets and `tauri-action` inputs. Until then the warnings described above stay.
