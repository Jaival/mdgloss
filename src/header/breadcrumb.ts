/** The header's breadcrumb: the folders above the open file, and the file's name. */
export interface Breadcrumb {
  folders: string[];
  file: string;
}

/**
 * Splits a file path into a breadcrumb. Inside the open folder, the folders
 * run from the folder's own name down to the file's parent; otherwise (a single
 * file open) only the parent folder is shown.
 * "C:\\notes\\os\\week1.md" in "C:\\notes" -> { folders: ["notes", "os"], file: "week1.md" }
 */
export function breadcrumb(path: string, root: string | null): Breadcrumb {
  const parts = path.split(/[\\/]/).filter(Boolean);
  const file = parts.pop() ?? path;
  const rootParts = root?.split(/[\\/]/).filter(Boolean) ?? [];
  const inRoot =
    rootParts.length > 0 &&
    rootParts.length <= parts.length &&
    rootParts.every((part, i) => parts[i] === part);
  return { folders: inRoot ? parts.slice(rootParts.length - 1) : parts.slice(-1), file };
}

/** "1 highlight", "4 highlights". */
export function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
