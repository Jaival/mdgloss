import type { Root } from "hast";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";
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

// Raw HTML in the markdown is dropped (remark-rehype's default), so documents can't run scripts.
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkWikiEmbeds)
  .use(remarkRehype)
  .use(rehypeSourceOffsets)
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
