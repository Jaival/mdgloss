import {
  exists,
  mkdir,
  readDir,
  readTextFile,
  rename,
  stat,
  watch as tauriWatch,
  writeTextFile,
  type WatchEvent,
} from "@tauri-apps/plugin-fs";
import { joinPath } from "./path";
import type { ChangeEvent, Entry, FileSystem, Unsubscribe } from "./types";

/** How long the native watcher waits to batch bursts of changes (editors often save in several writes). */
const WATCH_DEBOUNCE_MS = 300;

/**
 * Desktop adapter backed by the Tauri fs plugin. Paths are absolute and only
 * reachable after the user picked them (or a parent folder) in a dialog.
 */
export class TauriFileSystem implements FileSystem {
  readFile(path: string): Promise<string> {
    return readTextFile(path);
  }

  writeFile(path: string, content: string): Promise<void> {
    return writeTextFile(path, content);
  }

  rename(from: string, to: string): Promise<void> {
    return rename(from, to);
  }

  async listDir(path: string): Promise<Entry[]> {
    const entries = await readDir(path);
    return (
      entries
        // Symlinks are skipped so a link back to a parent folder can't make the tree loop.
        .filter((entry) => !entry.isSymlink)
        .map((entry) => ({
          path: joinPath(path, entry.name),
          name: entry.name,
          kind: entry.isDirectory ? "directory" : "file",
        }))
    );
  }

  exists(path: string): Promise<boolean> {
    return exists(path);
  }

  createDir(path: string): Promise<void> {
    return mkdir(path, { recursive: true });
  }

  watch(path: string, onChange: (event: ChangeEvent) => void): Unsubscribe {
    let stopped = false;
    let unwatch: (() => void) | undefined;

    tauriWatch(
      path,
      (event) => {
        if (!stopped) toChangeEvents(event).forEach(onChange);
      },
      { recursive: true, delayMs: WATCH_DEBOUNCE_MS },
    )
      .then((stop) => {
        // The caller may unsubscribe before the native watcher is ready.
        if (stopped) stop();
        else unwatch = stop;
      })
      .catch((error: unknown) => console.error(`Could not watch ${path}`, error));

    return () => {
      stopped = true;
      unwatch?.();
    };
  }

  async canWrite(path: string): Promise<boolean> {
    try {
      const info = await stat(path);
      return !info.readonly;
    } catch {
      return false;
    }
  }
}

/**
 * Maps a native watcher event to mdgloss change events. Access events are
 * ignored. A rename is reported as the old path removed and the new one
 * created, so a renamed file shows up in the tree.
 */
export function toChangeEvents(event: WatchEvent): ChangeEvent[] {
  const { type } = event;
  if (typeof type !== "string" && "modify" in type && type.modify.kind === "rename") {
    const { mode } = type.modify;
    const [first, second] = event.paths;
    if (mode === "from") return event.paths.map((path) => ({ path, kind: "removed" }));
    if (mode === "to") return event.paths.map((path) => ({ path, kind: "created" }));
    if (mode === "both" && first && second) {
      return [
        { path: first, kind: "removed" },
        { path: second, kind: "created" },
      ];
    }
  }
  let kind: ChangeEvent["kind"] | null;
  if (typeof type === "string") kind = "modified";
  else if ("create" in type) kind = "created";
  else if ("remove" in type) kind = "removed";
  else if ("modify" in type) kind = "modified";
  else kind = null;

  return kind === null ? [] : event.paths.map((path) => ({ path, kind }));
}
