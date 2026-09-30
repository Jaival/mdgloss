/** Name of the hidden folder that holds annotations next to the markdown files. */
export const SIDECAR_DIR = ".mdgloss";

/**
 * Returns the sidecar JSON path for a markdown file.
 * "notes/week1.md" -> "notes/.mdgloss/week1.md.json"
 */
export function sidecarPath(markdownPath: string): string {
  const normalized = markdownPath.replace(/\\/g, "/");
  const slash = normalized.lastIndexOf("/");
  const dir = slash === -1 ? "" : normalized.slice(0, slash + 1);
  const file = normalized.slice(slash + 1);
  if (file === "") {
    throw new Error(`Not a file path: "${markdownPath}"`);
  }
  return `${dir}${SIDECAR_DIR}/${file}.json`;
}
