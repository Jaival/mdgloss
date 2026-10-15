// Sets the app version in every file that holds it. See docs/RELEASING.md.
//   bun run version:set 0.0.3
import { readFileSync, writeFileSync } from "node:fs";

const version = process.argv[2]?.replace(/^v/, "");
const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;
const match = version?.match(SEMVER);
if (!match) {
  console.error("Usage: bun run version:set <major.minor.patch[-pre]>, e.g. 0.0.3");
  process.exit(1);
}

// The Windows .msi needs major and minor <= 255, patch <= 65535, and a numeric pre-release.
const [, major, minor, patch, pre] = match;
if (Number(major) > 255 || Number(minor) > 255 || Number(patch) > 65535) {
  console.error(
    `${version} can't be an MSI version: major and minor go up to 255, patch to 65535.`,
  );
  process.exit(1);
}
if (pre !== undefined && !/^\d+$/.test(pre)) {
  console.error(
    `The Windows .msi build fails on the pre-release "${pre}": it must be a number (0.1.0-1), ` +
      "or set bundle.windows.wix.version in tauri.conf.json. See docs/RELEASING.md.",
  );
  process.exit(1);
}

const files = [
  ["package.json", /("version":\s*")[^"]+(")/],
  ["src-tauri/tauri.conf.json", /("version":\s*")[^"]+(")/],
  // The first version line in Cargo.toml is the one under [package].
  ["src-tauri/Cargo.toml", /^(version = ")[^"]+(")/m],
  ["src-tauri/Cargo.lock", /(name = "mdgloss"\r?\nversion = ")[^"]+(")/],
];

for (const [file, pattern] of files) {
  const text = readFileSync(file, "utf8");
  if (!pattern.test(text)) {
    console.error(`No version found in ${file}; nothing was changed after this point.`);
    process.exit(1);
  }
  writeFileSync(file, text.replace(pattern, `$1${version}$2`));
  console.log(`${file} -> ${version}`);
}
console.log(`\nNext: commit, merge to main, then tag v${version} on main (docs/RELEASING.md).`);
