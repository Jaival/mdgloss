# Dogfooding log

Daily use of mdgloss for real reading, from 27 October 2026. It feeds three things in the [plan](SPEC.md#plan): "fix what daily use found" (week 7), "the 10 most annoying problems" (weeks 8 to 10) and the mini-gate on 13 December (at least 3 days a week in weeks 7 to 10).

The January gate counts annotation days from the sidecars, so this log doesn't need to prove use. It records what the sidecars can't: how long a session took and what got in the way.

## Checking the gates

`scripts/gate.ts` counts the days on which a highlight was created or last updated, from the sidecars and the app's own storage. It reads the folders you name and always adds the app storage folder (`%APPDATA%/dev.mdgloss.app/annotations` on Windows).

```sh
bun run gate mini <reading folder>...      # 13 Dec: at least 3 days in each of weeks 7 to 10
bun run gate january <reading folder>...   # 31 Jan: at least 20 of 31 days
bun run gate --from 2026-11-23 --to 2026-11-29 --min 3 <reading folder>...
```

It prints each plan week with its active days, then PASS or FAIL (exit code 0 or 1). Days are local calendar days. Limits: a deleted highlight leaves no trace, and an edited one only keeps its last update day, so the count can be lower than the real use, never higher.

## How to log

- One row per day you open the app for reading, added the same day. Minutes are rough, rounded to 5.
- **Version** is the installed release (`v0.0.4`) or `dev` for `bun tauri dev`.
- Each problem gets one line under [Problems](#problems) and its number in the session row. When a problem comes up again, raise its count instead of adding a new line.
- A day with no use gets no row. Write the reason under [Missed days](#missed-days) if there was one (exams, travel, app broken).

## Sessions

| Date   | Week | Version | Platform | Minutes | What I read                                         | Problems |
| ------ | ---- | ------- | -------- | ------- | --------------------------------------------------- | -------- |
| 27 Oct | 4    | v0.0.4  | Windows  |         | Release checklist, **Annotations** section (folder) |          |

## Problems

Numbered in the order found. Severity: **blocker** (stopped the session), **annoying** (slowed it down), **minor**.

| #   | Problem | Severity | Count | Fixed in |
| --- | ------- | -------- | ----- | -------- |

## Missed days

| Date            | Reason                                                                                         |
| --------------- | ---------------------------------------------------------------------------------------------- |
| 28 Oct – 22 Nov | Not reading many documents in this period, so no sessions. Week 7 of the mini-gate has no use. |

## Weekly totals

Filled in on Sunday. Days used out of 7, and total minutes.

| Week | Dates          | Days | Minutes |
| ---- | -------------- | ---- | ------- |
| 4    | 26 Oct – 1 Nov |      |         |
