import { isMarkdownFile, resolveRelative } from "../fs/path";

export type LinkTarget =
  | { type: "anchor"; id: string }
  | { type: "external"; url: string }
  | { type: "markdown"; path: string }
  | { type: "other"; path: string };

/** "https:", "mailto:", "data:" and protocol-relative "//host". A Windows drive ("C:") is not a scheme. */
export function isExternalUrl(url: string): boolean {
  return /^[a-z][a-z0-9+.-]+:/i.test(url) || url.startsWith("//");
}

/** Drops "?query" and "#hash" and decodes %20 and friends, so the rest can be used as a file path. */
function toFilePath(url: string): string {
  const path = url.replace(/[?#].*$/, "");
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

/** Resolves an image src from the markdown to an absolute file path, or returns external URLs unchanged. */
export function resolveImage(
  docPath: string,
  src: string,
): { type: "file" | "external"; url: string } {
  return isExternalUrl(src)
    ? { type: "external", url: src }
    : { type: "file", url: resolveRelative(docPath, toFilePath(src)) };
}

/** Decides what clicking a link in the document at docPath should do. */
export function classifyLink(docPath: string, href: string): LinkTarget {
  if (href.startsWith("#")) return { type: "anchor", id: decodeURIComponent(href.slice(1)) };
  if (isExternalUrl(href)) return { type: "external", url: href };
  const path = resolveRelative(docPath, toFilePath(href));
  return isMarkdownFile(path) ? { type: "markdown", path } : { type: "other", path };
}
