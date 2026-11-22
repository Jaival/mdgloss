// Counts the days mdgloss was used, from the annotation timestamps, and checks a
// gate from docs/SPEC.md ("The January gate"). Run with bun:
//   bun run gate mini <folder>...       weeks 7-10, at least 3 days a week
//   bun run gate january <folder>...    January 2027, at least 20 days
//   bun run gate --from 2026-11-01 --to 2026-11-30 [--min 10 | --per-week 3] <folder>...
// Each folder is searched for .mdgloss sidecars. The app's own storage is always
// read too (override with --app-data <dir>). Exit code: 0 pass, 1 fail, 2 bad usage.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseAnnotations } from "../src/annotations/format.ts";
import { SIDECAR_DIR } from "../src/annotations/sidecar.ts";
import type { AnnotationFile } from "../src/annotations/types.ts";
import { activeDays, checkGate, GATES, isDay, type Gate } from "../src/gate/days.ts";

const IDENTIFIER = "dev.mdgloss.app"; // src-tauri/tauri.conf.json
const SKIP = new Set(["node_modules", ".git"]);

function usage(message: string): never {
  console.error(
    `${message}\nUsage: bun run gate <mini|january|--from D --to D [--min N|--per-week N]> [--app-data DIR] <folder>...`,
  );
  process.exit(2);
}

/** Tauri's appDataDir()/annotations on this OS. */
function defaultAppData(): string {
  const home = homedir();
  const base =
    process.platform === "win32"
      ? (process.env.APPDATA ?? join(home, "AppData", "Roaming"))
      : process.platform === "darwin"
        ? join(home, "Library", "Application Support")
        : (process.env.XDG_DATA_HOME ?? join(home, ".local", "share"));
  return join(base, IDENTIFIER, "annotations");
}

function parseArgs(argv: string[]) {
  let gate: Gate | null = null;
  let from: string | null = null;
  let to: string | null = null;
  let min: number | null = null;
  let perWeek: number | null = null;
  let appData = defaultAppData();
  const folders: string[] = [];
  const value = (i: number, flag: string) => argv[i + 1] ?? usage(`${flag} needs a value`);
  const count = (raw: string, flag: string) => {
    const n = Number(raw);
    return Number.isInteger(n) && n > 0 ? n : usage(`${flag} must be a whole number above 0`);
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "mini" || arg === "january") gate = GATES[arg];
    else if (arg === "--from") from = value(i++, arg);
    else if (arg === "--to") to = value(i++, arg);
    else if (arg === "--min") min = count(value(i++, arg), arg);
    else if (arg === "--per-week") perWeek = count(value(i++, arg), arg);
    else if (arg === "--app-data") appData = value(i++, arg);
    else if (arg.startsWith("--")) usage(`Unknown option ${arg}`);
    else folders.push(arg);
  }
  if (!gate) {
    if (!from || !to) usage("Give a gate (mini, january) or --from and --to");
    if (!isDay(from) || !isDay(to)) usage("Dates must be YYYY-MM-DD");
    if (from > to) usage("--from is after --to");
    gate = {
      from,
      to,
      rule: perWeek ? { kind: "weekly", perWeek } : { kind: "total", min: min ?? 1 },
    };
  }
  return { gate, appData, folders };
}

/** Every .mdgloss/*.json under a folder. */
function findSidecars(dir: string, out: string[]) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || SKIP.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.name === SIDECAR_DIR) out.push(...jsonFiles(path));
    else findSidecars(path, out);
  }
}

const jsonFiles = (dir: string) =>
  readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => join(dir, name));

const { gate, appData, folders } = parseArgs(process.argv.slice(2));
const paths: string[] = [];
for (const folder of folders) {
  if (!existsSync(folder) || !statSync(folder).isDirectory()) usage(`Not a folder: ${folder}`);
  findSidecars(folder, paths);
}
if (existsSync(appData)) paths.push(...jsonFiles(appData));

const files: AnnotationFile[] = [];
for (const path of paths) {
  try {
    files.push(parseAnnotations(readFileSync(path, "utf8")));
  } catch (e) {
    console.warn(`Skipped ${path}: ${(e as Error).message}`);
  }
}

const report = checkGate(gate, activeDays(files));
const rule =
  gate.rule.kind === "weekly"
    ? `at least ${gate.rule.perWeek} days in every week`
    : `at least ${gate.rule.min} of ${report.days} days`;
console.log(`Gate ${gate.from} to ${gate.to}: ${rule}`);
console.log(`Read ${files.length} annotation files (${folders.length} folders + ${appData})`);
for (const week of report.weeks) {
  const mark = gate.rule.kind === "weekly" ? (week.pass ? "  ok  " : "  MISS") : "      ";
  const days = week.active.map((day) => day.slice(5)).join(" ") || "-";
  console.log(
    `${mark} week ${String(week.week).padStart(2)}  ${week.from}..${week.to}  ${week.active.length}/${week.days}  ${days}`,
  );
}
console.log(
  `${report.active.length} of ${report.days} days used. ${report.pass ? "PASS" : "FAIL"}`,
);
process.exit(report.pass ? 0 : 1);
