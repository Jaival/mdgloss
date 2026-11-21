import { useEffect, useState } from "react";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";

const LAST_CHECK_KEY = "mdgloss.lastUpdateCheck";
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The spec allows one check a day: the manifest's download count is the weekly-users
 * estimate, so each user should count once per day of use. A stored time in the future
 * (clock changed) or not a number counts as never checked.
 */
export function isCheckDue(lastCheck: string | null, now: number): boolean {
  const last = Number(lastCheck);
  return lastCheck === null || !Number.isFinite(last) || last > now || now - last >= DAY_MS;
}

/**
 * Checks GitHub Releases once a day and downloads a newer signed version in the
 * background. Returns the downloaded update, which installs only when the user asks.
 * Dev builds never check.
 */
export function useUpdate() {
  const [ready, setReady] = useState<Update | null>(null);

  useEffect(() => {
    const now = Date.now();
    if (import.meta.env.DEV || !isCheckDue(localStorage.getItem(LAST_CHECK_KEY), now)) return;
    // Counted as a check even if it fails, so a bad network doesn't retry on every start.
    localStorage.setItem(LAST_CHECK_KEY, String(now));
    (async () => {
      const update = await check();
      if (!update) return;
      await update.download();
      setReady(update);
    })().catch((e: unknown) => console.warn("Update check failed", e));
  }, []);

  /** On Windows the installer closes the app itself; macOS needs the relaunch. */
  async function install() {
    await ready?.install();
    await relaunch();
  }

  return { ready, install };
}
