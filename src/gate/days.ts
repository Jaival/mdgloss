import type { AnnotationFile } from "../annotations/types";

/** A calendar day, "YYYY-MM-DD". */
export type Day = string;

/** Monday of plan week 0 (docs/SPEC.md#plan): week 7 starts 16 Nov 2026, week 17 on 25 Jan 2027. */
export const PLAN_START: Day = "2026-09-28";

export type GateRule = { kind: "weekly"; perWeek: number } | { kind: "total"; min: number };

export interface Gate {
  from: Day;
  to: Day;
  rule: GateRule;
}

/** The two gates in docs/SPEC.md ("The January gate"). */
export const GATES = {
  /** Sunday 13 December: at least 3 days a week in weeks 7 to 10. */
  mini: { from: "2026-11-16", to: "2026-12-13", rule: { kind: "weekly", perWeek: 3 } },
  /** 31 January: at least 20 of the 31 days. */
  january: { from: "2027-01-01", to: "2027-01-31", rule: { kind: "total", min: 20 } },
} satisfies Record<string, Gate>;

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function isDay(value: string): value is Day {
  return DAY.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The local calendar day of an ISO timestamp, or null when it isn't one. */
export function localDay(iso: string): Day | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The days on which any highlight was created or last updated. */
export function activeDays(files: readonly AnnotationFile[]): Set<Day> {
  const days = new Set<Day>();
  for (const file of files) {
    for (const highlight of file.highlights) {
      for (const stamp of [highlight.created, highlight.updated]) {
        const day = localDay(stamp);
        if (day) days.add(day);
      }
    }
  }
  return days;
}

// Days are handled as UTC midnights so the arithmetic never crosses a DST change.
const toTime = (day: Day) => Date.parse(`${day}T00:00:00Z`);
const toDay = (time: number): Day => new Date(time).toISOString().slice(0, 10);
const DAY_MS = 86_400_000;

/** Every day from `from` to `to`, both included. */
export function daysBetween(from: Day, to: Day): Day[] {
  const days: Day[] = [];
  for (let t = toTime(from); t <= toTime(to); t += DAY_MS) days.push(toDay(t));
  return days;
}

/** The plan week a day falls in (weeks start on Monday). */
export function planWeek(day: Day): number {
  return Math.floor((toTime(day) - toTime(PLAN_START)) / (7 * DAY_MS));
}

export interface WeekResult {
  week: number;
  from: Day;
  to: Day;
  active: Day[];
  /** Days of this week inside the range. */
  days: number;
  pass: boolean;
}

export interface GateReport {
  gate: Gate;
  active: Day[];
  days: number;
  /** Per plan week; for a total rule each week's pass is true. */
  weeks: WeekResult[];
  pass: boolean;
}

/** Whether the active days meet the gate, overall and week by week. */
export function checkGate(gate: Gate, active: ReadonlySet<Day>): GateReport {
  const range = daysBetween(gate.from, gate.to);
  const inRange = range.filter((day) => active.has(day));
  const weeks: WeekResult[] = [];
  for (const day of range) {
    const week = planWeek(day);
    let result = weeks.at(-1);
    if (result?.week !== week) {
      result = { week, from: day, to: day, active: [], days: 0, pass: true };
      weeks.push(result);
    }
    result.to = day;
    result.days += 1;
    if (active.has(day)) result.active.push(day);
  }
  if (gate.rule.kind === "weekly") {
    for (const week of weeks) week.pass = week.active.length >= gate.rule.perWeek;
  }
  const pass =
    gate.rule.kind === "weekly"
      ? weeks.every((week) => week.pass)
      : inRange.length >= gate.rule.min;
  return { gate, active: inRange, days: range.length, weeks, pass };
}
