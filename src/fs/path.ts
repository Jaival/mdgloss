const MARKDOWN_EXTENSIONS = [".md", ".markdown"];

/**
 * Joins a folder path and an entry name, keeping the folder's separator style.
 * "C:\\docs" + "week1.md" -> "C:\\docs\\week1.md"
 */
export function joinPath(dir: string, name: string): string {
  const separator = dir.includes("\\") && !dir.includes("/") ? "\\" : "/";
  const trimmed = dir.replace(/[\\/]+$/, "");
  return `${trimmed}${separator}${name}`;
}

/** Last segment of a path, accepting either separator. */
export function baseName(path: string): string {
  const trimmed = path.replace(/[\\/]+$/, "");
  return trimmed.slice(Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\")) + 1);
}

export function isMarkdownFile(name: string): boolean {
  const lower = name.toLowerCase();
  return MARKDOWN_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
