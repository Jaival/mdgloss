# DevOps guide

How mdgloss is built, checked and kept up to date: local setup, CI, branches and pull requests, dependency updates, and repository settings. Releasing has its own guide: [RELEASING.md](RELEASING.md).

## Toolchain

| Tool                | Version                                     | Notes                                                                                                                  |
| ------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Bun                 | pinned in `package.json` (`packageManager`) | Package manager and script runner. CI reads the same pin                                                               |
| Node.js             | 22 or newer                                 | Vitest and some tools run on Node                                                                                      |
| Rust                | stable                                      | Tauri backend in `src-tauri/`                                                                                          |
| Tauri prerequisites | per OS                                      | [tauri.app/start/prerequisites](https://tauri.app/start/prerequisites/). On Windows: WebView2 and the MSVC build tools |

VS Code recommends the Tauri and rust-analyzer extensions (`.vscode/extensions.json`).

## Local development

```bash
bun install              # after every pull that touches bun.lock
bun run tauri dev        # desktop app with hot reload (Vite on port 1420)
bun run dev              # frontend only, in a browser (no file access)
```

Checks, the same ones CI runs:

```bash
bun run format:check     # Prettier
bun run lint             # ESLint
bun run typecheck        # tsc --noEmit
bun run test             # Vitest. Not "bun test", which runs Bun's own runner and skips Vitest
bun run build            # tsc + vite build into dist/

cd src-tauri
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings
cargo test
```

`cargo` needs `dist/` to exist (`tauri::generate_context!` embeds the frontend at compile time), so run `bun run build` once before the Rust checks.

Tests that need a DOM put `// @vitest-environment happy-dom` at the top of the file. The rest run in plain Node.

### Known local gotchas

- **Tests fail to start with "Cannot find package …".** `node_modules` is older than `bun.lock`, usually after merging a PR that added a dependency. Run `bun install`.
- **`format:check` fails on files you didn't touch (Windows).** Files were checked out with CRLF. `.gitattributes` forces LF, but files checked out before it was added keep CRLF. Fix with `git rm --cached -r . && git reset --hard`. **This discards uncommitted changes**, so commit or stash first.
- **Shell heredocs eat backslashes.** Writing test strings like `"\\*"` through a heredoc in Git Bash can turn them into `"\*"` (just `*` in JavaScript). Write source files with an editor.

## Continuous integration

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs on every push to `main` and every pull request. A new push to the same branch cancels the run still in progress.

| Job                                     | Runner        | Steps                                                                                                                             |
| --------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Frontend (lint, typecheck, test, build) | ubuntu-latest | `bun install --frozen-lockfile`, format check, lint, typecheck, test, build                                                       |
| Rust (fmt, clippy, test)                | ubuntu-latest | Installs WebKitGTK and the other Tauri Linux libraries, builds the frontend, then `cargo fmt`, `clippy -D warnings`, `cargo test` |

- `--frozen-lockfile` fails the job if `package.json` and `bun.lock` disagree. Commit `bun.lock` with every dependency change.
- Clippy warnings are errors.
- The Rust job runs on Linux. That catches Rust errors, but Windows and macOS only get built in the release workflow. Linux isn't a release target for version 1.
- Rust builds are cached with `Swatinem/rust-cache` (keyed on `Cargo.lock`), which brings the job down to about 1–2 minutes when the cache is warm. Only `main` saves the cache. A PR's cache could only be reused by that PR, and it would push `main`'s cache out of the repository's 10 GB limit.

The workflow token is read-only (`permissions: contents: read`). Only the release workflow can write, and only to releases.

## Branches and pull requests

- `main` is always releasable. All work goes through a pull request into `main`.
- Branch names start with the kind of change: `feat/…`, `fix/…`, `ci/…`, `chore/…`. Dependabot uses `dependabot/…`.
- **Target `main`, even for work that depends on another open PR.** A stacked PR once merged into its parent feature branch instead of `main` (#10) and had to be re-landed (#13). If you have to stack, re-target the PR to `main` before merging.
- One topic per PR. The description says what changed, why, and how it was tested.
- Merged branches are deleted automatically.
- Merge commits and squash merges are both allowed. History so far uses merge commits.

Commit messages: a short imperative subject ("Check the release tag matches the app version") and a body that explains why.

## Dependency updates

[`.github/dependabot.yml`](../.github/dependabot.yml) checks weekly:

| Ecosystem      | Directory    | Grouping                          |
| -------------- | ------------ | --------------------------------- |
| bun            | `/`          | Minor and patch updates in one PR |
| cargo          | `/src-tauri` | Minor and patch updates in one PR |
| github-actions | `/`          | One PR per action                 |

Major versions arrive as separate PRs. How to handle them:

- **Grouped minor/patch PRs:** merge when CI is green. A newer grouped PR replaces the older one, so close superseded ones.
- **Major versions:** read the changelog first. Example: TypeScript 7 (#2) fails CI because `typescript-eslint` doesn't support TS 7 yet. Leave it open, or close it and add an `ignore` rule for `typescript` major versions until the linter catches up.
- **GitHub Actions:** keep both workflows on the same major version. Both use `actions/checkout@v7`, and `release.yml` uses `tauri-action@v1`. Check a new major version of `tauri-action` on a throwaway tag (see below) before relying on it.

After merging any dependency PR, run `bun install` locally.

## Testing the release workflow

Full release builds only run on tags. Merging a change to `release.yml` runs the cache warm-up builds on `main`, which catches build errors but not the release and upload steps. To try one:

1. Merge the change to `main`.
2. Set a throwaway version through a PR, or reuse the next real version.
3. Tag and push, watch the run, then delete the draft release and the tag if it was only a test (commands in [RELEASING.md](RELEASING.md#when-something-goes-wrong)).

To test the version check script without a release, run it locally with a tag name:

```bash
GITHUB_REF_NAME=v0.0.2 bash -c "$(sed -n '/- run: |/,/done/p' .github/workflows/release.yml | sed '1d;s/^          //')"
```

## Secrets

| Secret                                      | Used by          | Status        |
| ------------------------------------------- | ---------------- | ------------- |
| `GITHUB_TOKEN`                              | release workflow | Built in      |
| `TAURI_SIGNING_PRIVATE_KEY` and `_PASSWORD` | updater signing  | Week 7        |
| Apple certificate, notarization credentials | macOS signing    | February 2027 |
| Windows signing credentials                 | Windows signing  | February 2027 |

The repository has no secrets yet. Add them under **Settings → Secrets and variables → Actions**, or with `gh secret set NAME < file`. Never commit keys. Keep a backup of each in a password manager.

## Repository settings

- **Branch protection:** none on `main` yet. Before others contribute, or before launch at the latest, require pull requests and both CI jobs to pass before merging.
- **Default branch:** `main`. **Delete branch on merge:** on.
- **License:** MIT.

## Privacy constraints

The spec promises no account, no server and no analytics. Don't add telemetry, crash reporting or error-tracking services to the app or the build. The only usage signal will be the download count of the updater manifest on GitHub Releases. When the updater ships (week 7), the README has to say so.
