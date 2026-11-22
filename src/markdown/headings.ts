import type { Element, ElementContent } from "hast";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { remarkWikiEmbeds } from "./wikiEmbeds";

export interface Heading {
  /** 1 for `#`, up to 6. */
  depth: number;
  /** The heading's rendered text, without markup. */
  text: string;
  /** The id the reader gives the heading element (rehype-slug), for getElementById. */
  id: string;
  /** Offset of the heading in the markdown source. */
  start: number;
}

// The same steps as the reader's pipeline up to rehype-slug, so ids match the rendered ones.
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkWikiEmbeds)
  .use(remarkRehype)
  .use(rehypeSlug);

const HEADING = /^h([1-6])$/;

function textOf(node: ElementContent): string {
  if (node.type === "text") return node.value;
  return node.type === "element" ? node.children.map(textOf).join("") : "";
}

/** Every heading in the markdown with text, in document order. */
export function extractHeadings(source: string): Heading[] {
  const headings: Heading[] = [];
  visit(processor.runSync(processor.parse(source), source), "element", (node: Element) => {
    const depth = HEADING.exec(node.tagName)?.[1];
    const start = node.position?.start.offset;
    if (!depth || start === undefined || typeof node.properties.id !== "string") return;
    const text = node.children.map(textOf).join("").replace(/\s+/g, " ").trim();
    if (text) headings.push({ depth: Number(depth), text, id: node.properties.id, start });
  });
  return headings;
}

/**
 * How many highlights start in each heading's section: from the heading to the
 * next heading of any depth. Highlights above the first heading aren't counted.
 */
export function countNotes(headings: readonly Heading[], starts: readonly number[]): number[] {
  return headings.map((heading, i) => {
    const end = headings[i + 1]?.start ?? Infinity;
    return starts.filter((start) => start >= heading.start && start < end).length;
  });
}

/**
 * The heading the reader is in: the last one whose top is at or above `line`.
 * `tops` are the headings' tops relative to the scroll area, in document order.
 * -1 while the first heading is still below the line.
 */
export function headingInView(tops: readonly number[], line: number): number {
  let current = -1;
  for (const [i, top] of tops.entries()) {
    if (top > line) break;
    current = i;
  }
  return current;
}
