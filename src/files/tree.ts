import { isMarkdownFile } from "../fs/path";
import type { FileSystem } from "../fs/types";

export type TreeNode =
  | { kind: "file"; name: string; path: string }
  | { kind: "directory"; name: string; path: string; children: TreeNode[] };

/** Folders never worth showing: hidden ones (.git, .mdgloss) and dependency folders. */
function isSkippedFolder(name: string): boolean {
  return name.startsWith(".") || name === "node_modules";
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/** Folders first, then files; "week2" sorts before "week10". */
function compareNodes(a: TreeNode, b: TreeNode): number {
  if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
  return collator.compare(a.name, b.name);
}

/**
 * Lists the markdown files under a folder, recursively.
 * Folders without any markdown file inside them are left out.
 */
export async function loadMarkdownTree(fs: FileSystem, dir: string): Promise<TreeNode[]> {
  const entries = await fs.listDir(dir);

  const nodes = await Promise.all(
    entries.map(async (entry): Promise<TreeNode | null> => {
      if (entry.kind === "file") {
        return isMarkdownFile(entry.name)
          ? { kind: "file", name: entry.name, path: entry.path }
          : null;
      }
      if (isSkippedFolder(entry.name)) return null;
      const children = await loadMarkdownTree(fs, entry.path);
      return children.length > 0
        ? { kind: "directory", name: entry.name, path: entry.path, children }
        : null;
    }),
  );

  return nodes.filter((node): node is TreeNode => node !== null).sort(compareNodes);
}
