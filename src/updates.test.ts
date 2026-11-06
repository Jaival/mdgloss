import { describe, expect, it } from "vitest";
import { isCheckDue } from "./updates";

const HOUR = 60 * 60 * 1000;
const now = Date.UTC(2026, 10, 16, 9);

describe("isCheckDue", () => {
  it("checks the first time", () => {
    expect(isCheckDue(null, now)).toBe(true);
  });

  it("waits a day between checks", () => {
    expect(isCheckDue(String(now - 23 * HOUR), now)).toBe(false);
    expect(isCheckDue(String(now - 24 * HOUR), now)).toBe(true);
  });

  it("checks when the stored time is unusable", () => {
    expect(isCheckDue("not a time", now)).toBe(true);
    expect(isCheckDue(String(now + HOUR), now)).toBe(true);
  });
});
