import type { Image, PhrasingContent, Root, Text } from "mdast";
import { SKIP, visit } from "unist-util-visit";

/** ![[target#fragment|alias]] — Obsidian's embed syntax. */
const EMBED = /!\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]/g;
const IMAGE_EXTENSION = /\.(apng|avif|bmp|gif|ico|jpe?g|png|svg|webp)$/i;
/** "300" or "300x200", Obsidian's way of sizing an embedded image. */
const SIZE = /^(\d+)(?:x(\d+))?$/;

/**
 * Turns Obsidian image embeds (![[diagram.png]], ![[diagram.png|300]]) into image
 * nodes. The src is the bare target, marked with data-wiki-embed: Obsidian resolves
 * it by file name across the vault, not as a path relative to the document.
 * Embeds of notes are left as text.
 */
export function remarkWikiEmbeds() {
  return (tree: Root, file: { toString(): string }) => {
    const source = String(file);

    visit(tree, "text", (node: Text, index, parent) => {
      const start = node.position?.start.offset;
      const end = node.position?.end.offset;
      if (parent === undefined || index === undefined || start === undefined || end === undefined)
        return;

      const parts: PhrasingContent[] = [];
      let last = 0;
      // Escapes and entities make the value differ from the source, so each match is
      // found again in the source to get its offsets.
      let cursor = start;

      for (const match of node.value.matchAll(EMBED)) {
        const at = source.indexOf(match[0], cursor);
        if (at === -1 || at + match[0].length > end) break;
        cursor = at + match[0].length;
        const target = match[1].trim();
        if (source[at - 1] === "\\" || !IMAGE_EXTENSION.test(target)) continue;

        if (match.index > last) parts.push(textSlice(node.value.slice(last, match.index)));
        parts.push(embedImage(target, match[2]?.trim(), source, at, cursor));
        last = match.index + match[0].length;
      }

      if (parts.length === 0) return;
      if (last < node.value.length) parts.push(textSlice(node.value.slice(last)));
      parent.children.splice(index, 1, ...parts);
      return [SKIP, index + parts.length];
    });
  };
}

function textSlice(value: string): Text {
  return { type: "text", value };
}

function embedImage(
  target: string,
  option: string | undefined,
  source: string,
  start: number,
  end: number,
): Image {
  const size = option?.match(SIZE);
  return {
    type: "image",
    url: target,
    alt: size || !option ? target : option,
    position: { start: pointAt(source, start), end: pointAt(source, end) },
    data: {
      hProperties: {
        dataWikiEmbed: true,
        ...(size && { width: Number(size[1]), height: size[2] ? Number(size[2]) : undefined }),
      },
    },
  };
}

function pointAt(source: string, offset: number) {
  const before = source.slice(0, offset);
  const line = before.split("\n").length;
  return { line, column: offset - before.lastIndexOf("\n"), offset };
}
