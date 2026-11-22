import type { Nodes, Root } from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";

// TODO: merge with the shared heading module from UI plan step 3 (sidebar Outline tab).

export interface Heading {
  /** 1 to 6. */
  depth: number;
  /** The heading's plain text, markup removed. */
  text: string;
  /** Where the heading starts in the source; the rendered element has it as data-source-start. */
  offset: number;
}

const parser = unified().use(remarkParse).use(remarkGfm);

function plainText(node: Nodes): string {
  if ("value" in node) return node.value;
  if ("children" in node) return node.children.map(plainText).join("");
  if (node.type === "image") return node.alt ?? "";
  return "";
}

/** The document's headings in order. Empty headings are left out. */
export function extractHeadings(source: string): Heading[] {
  const tree = parser.parse(source) as Root;
  const headings: Heading[] = [];
  visit(tree, "heading", (node) => {
    const text = plainText(node).replace(/\s+/g, " ").trim();
    const offset = node.position?.start.offset;
    if (text && offset !== undefined) headings.push({ depth: node.depth, text, offset });
  });
  return headings;
}
