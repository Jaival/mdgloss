import type { Element, Root, Text } from "hast";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { SKIP, visit } from "unist-util-visit";
import { remarkWikiEmbeds } from "./wikiEmbeds";

/**
 * Writes each element's markdown source range onto it as data-source-start and
 * data-source-end. Selection mapping (week 3) walks from a DOM selection to these.
 */
function rehypeSourceOffsets() {
  return (tree: Root) => {
    visit(tree, "element", (node) => {
      const start = node.position?.start.offset;
      const end = node.position?.end.offset;
      if (start === undefined || end === undefined) return;
      node.properties.dataSourceStart = start;
      node.properties.dataSourceEnd = end;
    });
  };
}

/**
 * Marks where each piece of rendered text comes from with data-text-start and
 * data-text-end, so a selection can be mapped to source offsets character by
 * character (see selection/). The element's text and that source range differ
 * only by markup the renderer removed: escapes, entities, blockquote markers.
 *
 * A text that is its element's only child marks the element; other texts are
 * wrapped in a span. Code blocks mark the code between the fences, because
 * highlighting replaces their text afterwards. Text the renderer made up
 * (footnote numbers, whitespace between table rows) has no position and
 * stays unmarked.
 */
function rehypeTextOffsets() {
  return (tree: Root, file: { toString(): string }) => {
    const source = String(file);

    visit(tree, "element", (node, _index, parent) => {
      if (node.tagName === "code" && parent?.type === "element" && parent.tagName === "pre") {
        const range = codeContentRange(source, node.position ?? parent.position);
        if (range) markText(node, range.start, range.end);
        return SKIP;
      }

      const [only] = node.children;
      if (node.children.length === 1 && only.type === "text") {
        const range = rangeOf(only);
        if (range) markText(node, range.start, range.end);
        return;
      }

      node.children = node.children.map((child) => {
        const range = child.type === "text" ? rangeOf(child) : undefined;
        if (!range) return child;
        const span: Element = {
          type: "element",
          tagName: "span",
          properties: {},
          children: [child],
        };
        markText(span, range.start, range.end);
        return span;
      });
    });
  };
}

function rangeOf(node: Text) {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  return start === undefined || end === undefined ? undefined : { start, end };
}

function markText(node: Element, start: number, end: number) {
  node.properties.dataTextStart = start;
  node.properties.dataTextEnd = end;
}

const OPENING_FENCE = /^[ \t]*(`{3,}|~{3,})[^\n]*(\n|$)/;
const CLOSING_FENCE = /^[ \t>]*(`{3,}|~{3,})[ \t]*$/;

/** The source range of a code block without its fences. */
function codeContentRange(source: string, position: Element["position"]) {
  const start = position?.start.offset;
  const end = position?.end.offset;
  if (start === undefined || end === undefined) return undefined;

  const block = source.slice(start, end);
  const opening = block.match(OPENING_FENCE);
  if (!opening) return { start, end }; // indented code has no fences

  const lastLine = block.lastIndexOf("\n");
  const closed = lastLine >= opening[0].length - 1 && CLOSING_FENCE.test(block.slice(lastLine + 1));
  return { start: start + opening[0].length, end: closed ? start + lastLine + 1 : end };
}

// Raw HTML in the markdown is dropped (remark-rehype's default), so documents can't run scripts.
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkWikiEmbeds)
  .use(remarkRehype)
  .use(rehypeSourceOffsets)
  .use(rehypeTextOffsets)
  .use(rehypeSlug)
  .use(rehypeHighlight);

/** Parses markdown into an HTML syntax tree that keeps source offsets. */
export function markdownToHast(source: string): Root {
  return processor.runSync(processor.parse(source), source);
}

// Skips highlighting, which is most of the rendering cost; remark-rehype still resolves ![x][ref].
const imageProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkWikiEmbeds)
  .use(remarkRehype);

export interface ImageSources {
  /** Paths or URLs from ![alt](src), relative to the document. */
  paths: string[];
  /** File names from Obsidian's ![[name.png]], found by name in the vault. */
  embeds: string[];
}

/** Every image src in the markdown, in document order, without duplicates. */
export function imageSources(source: string): ImageSources {
  const paths = new Set<string>();
  const embeds = new Set<string>();
  visit(imageProcessor.runSync(imageProcessor.parse(source), source), "element", (node) => {
    if (node.tagName !== "img" || typeof node.properties.src !== "string") return;
    (node.properties.dataWikiEmbed ? embeds : paths).add(node.properties.src);
  });
  return { paths: [...paths], embeds: [...embeds] };
}
