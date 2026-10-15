import { alignText } from "./align";

/** Characters of context kept on each side of a quote (see docs/SPEC.md). */
export const CONTEXT_LENGTH = 32;

/** A selection in the rendered markdown, expressed against the source. */
export interface SourceSelection {
  start: number;
  end: number;
  /** source.slice(start, end), including any markdown syntax inside it. */
  quote: string;
  prefix: string;
  suffix: string;
}

/** Elements whose text maps to a source range; written by rehypeTextOffsets. */
const TEXT_HOST = "[data-text-start]";

/**
 * Converts a DOM range inside `root` (the rendered markdown) to source
 * offsets. Ends that fall on text the renderer made up, such as footnote
 * numbers, move inward to the nearest source text. Surrounding whitespace is
 * left out of the quote. Returns null when nothing from the source is selected.
 */
export function toSourceSelection(
  range: Range,
  root: Element,
  source: string,
): SourceSelection | null {
  if (range.collapsed) return null;

  const texts = mappedTexts(root);
  const first = texts.findIndex((text) =>
    isAtOrAfter(text, range.startContainer, range.startOffset),
  );
  const last = findLastIndex(texts, (text) =>
    isAtOrBefore(text, range.endContainer, range.endOffset),
  );
  if (first === -1 || last === -1 || first > last) return null;

  const startText = texts[first];
  const endText = texts[last];
  const startOffset = startText === range.startContainer ? range.startOffset : 0;
  const endOffset = endText === range.endContainer ? range.endOffset : endText.length;

  let start = sourceOffset(startText, startOffset, source, "start");
  let end = sourceOffset(endText, endOffset, source, "end");
  while (start < end && /\s/.test(source[start])) start++;
  while (end > start && /\s/.test(source[end - 1])) end--;
  if (start >= end) return null;

  return {
    start,
    end,
    quote: source.slice(start, end),
    prefix: source.slice(Math.max(0, start - CONTEXT_LENGTH), start),
    suffix: source.slice(end, end + CONTEXT_LENGTH),
  };
}

/** Text nodes inside `root` that came from the source, in document order. */
function mappedTexts(root: Element): Text[] {
  const document = root.ownerDocument;
  const walker = document.createTreeWalker(root, 4 /* NodeFilter.SHOW_TEXT */);
  const texts: Text[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const host = node.parentElement?.closest(TEXT_HOST);
    if (host && root.contains(host) && node.textContent) texts.push(node as Text);
  }
  return texts;
}

const FOLLOWING = 4; // Node.DOCUMENT_POSITION_FOLLOWING
const PRECEDING = 2; // Node.DOCUMENT_POSITION_PRECEDING

/** Whether any of `text` lies at or after the boundary point (container, offset). */
function isAtOrAfter(text: Text, container: Node, offset: number): boolean {
  if (container === text) return offset < text.length;
  if (container.nodeType === 3) return Boolean(container.compareDocumentPosition(text) & FOLLOWING);
  const child = container.childNodes[offset];
  if (child) return child === text || Boolean(child.compareDocumentPosition(text) & FOLLOWING);
  // The point is after the container's last child: only text past the container counts.
  return !container.contains(text) && Boolean(container.compareDocumentPosition(text) & FOLLOWING);
}

/** Whether any of `text` lies at or before the boundary point (container, offset). */
function isAtOrBefore(text: Text, container: Node, offset: number): boolean {
  if (container === text) return offset > 0;
  if (container.nodeType === 3) return Boolean(container.compareDocumentPosition(text) & PRECEDING);
  const child = container.childNodes[offset - 1];
  if (child)
    return (
      child === text ||
      child.contains(text) ||
      Boolean(child.compareDocumentPosition(text) & PRECEDING)
    );
  // The point is before the container's first child.
  return Boolean(container.compareDocumentPosition(text) & PRECEDING) && !container.contains(text);
}

/**
 * The source offset of a point in a mapped text node. A start point maps to
 * where the next character begins, an end point to where the previous one ends.
 */
function sourceOffset(text: Text, offset: number, source: string, side: "start" | "end"): number {
  const host = text.parentElement!.closest(TEXT_HOST)!;
  const from = Number(host.getAttribute("data-text-start"));
  const to = Number(host.getAttribute("data-text-end"));

  // The rendered offset counts all text in the host before the point, such as
  // the highlighted spans inside a code block.
  let index = offset;
  const walker = host.ownerDocument.createTreeWalker(host, 4 /* NodeFilter.SHOW_TEXT */);
  for (let node = walker.nextNode(); node && node !== text; node = walker.nextNode()) {
    index += node.textContent?.length ?? 0;
  }

  // Entities and escapes inside code are literal text.
  const literal = host.tagName === "CODE";
  const spans = alignText(host.textContent ?? "", source, from, to, literal);
  if (spans.length === 0) return from;
  if (side === "start")
    return index < spans.length ? spans[index].start : spans[spans.length - 1].end;
  return index > 0 ? spans[index - 1].end : spans[0].start;
}

function findLastIndex<T>(items: T[], test: (item: T) => boolean): number {
  for (let i = items.length - 1; i >= 0; i--) if (test(items[i])) return i;
  return -1;
}
