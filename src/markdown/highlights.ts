import type { Element, ElementContent, Root, Text } from "hast";
import { visit } from "unist-util-visit";
import type { PlacedHighlight } from "../annotations/highlights";
import { alignText, type SourceSpan } from "../selection/align";

/**
 * Returns a copy of a rendered tree (from markdownToHast) with the highlighted
 * text wrapped in <mark data-highlight="id"> elements. A highlight that spans
 * several elements, such as two paragraphs or a bold word, gets one mark per
 * piece of text, so it renders across element boundaries without breaking the
 * HTML structure. Where highlights overlap, the later one in the list wins.
 * Text the renderer made up (footnote numbers, whitespace between table rows)
 * is never marked.
 */
export function applyHighlights(tree: Root, source: string, highlights: PlacedHighlight[]): Root {
  if (highlights.length === 0) return tree;
  const copy = structuredClone(tree);

  visit(copy, "element", (node) => {
    const from = node.properties.dataTextStart;
    const to = node.properties.dataTextEnd;
    if (typeof from !== "number" || typeof to !== "number") return;
    const touching = highlights.filter((h) => h.start < to && h.end > from);
    if (touching.length > 0) markHost(node, source, from, to, touching);
  });
  return copy;
}

interface TextSlot {
  parent: Element;
  index: number;
  node: Text;
}

/** Wraps the highlighted characters of one text-carrying element. */
function markHost(
  host: Element,
  source: string,
  from: number,
  to: number,
  highlights: PlacedHighlight[],
) {
  const slots = textSlots(host);
  const rendered = slots.map((slot) => slot.node.value).join("");
  // Entities and escapes inside code are literal text (as in selection mapping).
  const spans = alignText(rendered, source, from, to, host.tagName === "code");

  let position = 0;
  const pieces = slots.map((slot) => {
    const owners = spans
      .slice(position, position + slot.node.value.length)
      .map((span) => ownerOf(span, highlights));
    position += slot.node.value.length;
    return owners;
  });

  // Replace from the end so the indices of earlier slots in the same parent stay valid.
  for (let i = slots.length - 1; i >= 0; i--) {
    const { parent, index, node } = slots[i];
    const owners = pieces[i];
    if (owners.every((owner) => owner === undefined)) continue;
    parent.children.splice(index, 1, ...splitText(node.value, owners));
  }
}

/** The text nodes inside an element, in order, with where they sit. */
function textSlots(element: Element): TextSlot[] {
  const slots: TextSlot[] = [];
  element.children.forEach((child, index) => {
    if (child.type === "text") slots.push({ parent: element, index, node: child });
    else if (child.type === "element") slots.push(...textSlots(child));
  });
  return slots;
}

/** The highlight a character belongs to, if any. The last match wins. */
function ownerOf(span: SourceSpan, highlights: PlacedHighlight[]): PlacedHighlight | undefined {
  for (let i = highlights.length - 1; i >= 0; i--) {
    const h = highlights[i];
    // A character with no source match has an empty span; count it if it sits inside.
    const inside =
      span.start === span.end
        ? span.start > h.start && span.start < h.end
        : span.start >= h.start && span.end <= h.end;
    if (inside) return h;
  }
  return undefined;
}

/** Splits text into plain runs and <mark> runs, one per change of owner. */
function splitText(value: string, owners: (PlacedHighlight | undefined)[]): ElementContent[] {
  const result: ElementContent[] = [];
  let runStart = 0;
  for (let i = 1; i <= value.length; i++) {
    if (i < value.length && owners[i] === owners[runStart]) continue;
    const text: Text = { type: "text", value: value.slice(runStart, i) };
    const owner = owners[runStart];
    result.push(owner ? mark(owner, text) : text);
    runStart = i;
  }
  return result;
}

function mark(highlight: PlacedHighlight, text: Text): Element {
  return {
    type: "element",
    tagName: "mark",
    properties: {
      className: ["highlight", `highlight-${highlight.color}`],
      dataHighlight: highlight.id,
      dataActive: highlight.active || undefined,
    },
    children: [text],
  };
}
