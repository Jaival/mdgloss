import type { Root } from "hast";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";

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

// Raw HTML in the markdown is dropped (remark-rehype's default), so documents can't run scripts.
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSourceOffsets)
  .use(rehypeSlug)
  .use(rehypeHighlight);

/** Parses markdown into an HTML syntax tree that keeps source offsets. */
export function markdownToHast(source: string): Root {
  return processor.runSync(processor.parse(source), source);
}

// Skips highlighting, which is most of the rendering cost; remark-rehype still resolves ![x][ref].
const imageProcessor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype);

/** Every image src in the markdown, in document order, without duplicates. */
export function imageSources(source: string): string[] {
  const sources = new Set<string>();
  visit(imageProcessor.runSync(imageProcessor.parse(source), source), "element", (node) => {
    if (node.tagName === "img" && typeof node.properties.src === "string") {
      sources.add(node.properties.src);
    }
  });
  return [...sources];
}
