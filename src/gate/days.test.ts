import { describe, expect, it } from "vitest";
import type { AnnotationFile, Highlight } from "../annotations/types";
import {
  activeDays,
  checkGate,
  daysBetween,
  GATES,
  isDay,
  localDay,
  planWeek,
  type Day,
} from "./days";

/** A local-time ISO stamp at noon, so the day is the same in every timezone. */
const noon = (day: Day) => new Date(`${day}T12:00:00`).toISOString();

function file(...stamps: [created: Day, updated: Day][]): AnnotationFile {
  const highlights = stamps.map(([created, updated], i): Highlight => ({
    id: String(i),
    quote: "q",
    prefix: "",
    suffix: "",
    offset: 0,
    color: "yellow",
    comment: null,
    status: "anchored",
    created: noon(created),
    updated: noon(updated),
  }));
  return { schemaVersion: 1, file: "a.md", highlights };
}

describe("localDay", () => {
  it("gives the local calendar day of a timestamp", () => {
    expect(localDay(noon("2026-11-23"))).toBe("2026-11-23");
  });

  it("is null for a bad timestamp", () => {
    expect(localDay("not a date")).toBeNull();
  });
});

describe("isDay", () => {
  it("accepts YYYY-MM-DD dates only", () => {
    expect(isDay("2027-01-31")).toBe(true);
    expect(isDay("2027-1-31")).toBe(false);
    expect(isDay("2027-13-01")).toBe(false);
  });
});

describe("activeDays", () => {
  it("counts both created and updated days, once each, across files", () => {
    const days = activeDays([
      file(["2026-11-23", "2026-11-25"]),
      file(["2026-11-23", "2026-11-23"], ["2026-11-24", "2026-11-24"]),
    ]);
    expect([...days].sort()).toEqual(["2026-11-23", "2026-11-24", "2026-11-25"]);
  });
});

describe("daysBetween and planWeek", () => {
  it("lists every day in the range, both ends included", () => {
    expect(daysBetween("2026-12-30", "2027-01-02")).toEqual([
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
    ]);
  });

  it("numbers weeks as the plan does", () => {
    expect(planWeek("2026-11-16")).toBe(7);
    expect(planWeek("2026-11-22")).toBe(7);
    expect(planWeek("2026-11-23")).toBe(8);
    expect(planWeek("2026-12-13")).toBe(10);
    expect(planWeek("2027-01-25")).toBe(17);
  });
});

describe("checkGate", () => {
  it("mini gate: needs 3 days in each of weeks 7 to 10", () => {
    const active = new Set<Day>([
      ...["2026-11-16", "2026-11-17", "2026-11-18"],
      ...["2026-11-23", "2026-11-24", "2026-11-29"],
      ...["2026-11-30", "2026-12-02", "2026-12-04"],
      ...["2026-12-07", "2026-12-08", "2026-12-13"],
    ]);
    const report = checkGate(GATES.mini, active);
    expect(report.weeks.map((w) => [w.week, w.active.length, w.pass])).toEqual([
      [7, 3, true],
      [8, 3, true],
      [9, 3, true],
      [10, 3, true],
    ]);
    expect(report.pass).toBe(true);

    active.delete("2026-11-17");
    const missed = checkGate(GATES.mini, active);
    expect(missed.weeks[0].pass).toBe(false);
    expect(missed.pass).toBe(false);
  });

  it("january gate: needs 20 of 31 days, ignoring days outside January", () => {
    const days = daysBetween("2027-01-01", "2027-01-19");
    const report = checkGate(GATES.january, new Set([...days, "2026-12-31", "2027-02-01"]));
    expect(report.days).toBe(31);
    expect(report.active).toHaveLength(19);
    expect(report.pass).toBe(false);
    expect(checkGate(GATES.january, new Set([...days, "2027-01-31"])).pass).toBe(true);
  });
});
