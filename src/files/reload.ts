import type { FileSystem } from "../fs/types";

/** What reading the open file again found. */
export type Reload =
  | { type: "read"; content: string }
  /** Deleted or moved away. */
  | { type: "missing" }
  /** Still there but not readable now, for example mid-save. */
  | { type: "unreadable" };

/**
 * Reads the open file after a change on disk. Editors that save by replacing the
 * file remove it and create it again, so a removal is only "missing" if the file
 * is still gone when we look.
 */
export async function reloadFile(fs: FileSystem, path: string): Promise<Reload> {
  try {
    return { type: "read", content: await fs.readFile(path) };
  } catch {
    return (await fs.exists(path)) ? { type: "unreadable" } : { type: "missing" };
  }
}
