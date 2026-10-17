// @vitest-environment happy-dom
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createHighlight, placeHighlights, type PlacedHighlight } from "../annotations/highlights";
import { toSourceSelection } from "../selection/sourceSelection";
import { applyHighlights } from "./highlights";
import { Markdown } from "./Markdown";
import { markdownToHast } from "./pipeline";

/** Renders markdown with highlights into the test document and returns its root element. */
function mount(source: string, highlights: PlacedHighlight[] = []): HTMLElement {
  document.body.innerHTML = `<article>${renderToStaticMarkup(
    createElement(Markdown, {
      source,
      highlights,
      resolveImageSrc: (src) => src,
      onLinkClick: () => {},
    }),
  )}</article>`;
  return document.querySelector("article")!;
}

/** Selects the first occurrence of `rendered` across text nodes, like a drag would. */
function select(root: HTMLElement, rendered: string): Range {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: { node: Text; at: number }[] = [];
  let text = "";
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    nodes.push({ node: node as Text, at: text.length });
    text += node.textContent;
  }
  const from = text.indexOf(rendered);
  if (from === -1) throw new Error(`"${rendered}" is not in ${JSON.stringify(text)}`);
  const to = from + rendered.length;
  const start = nodes.find(({ node, at }) => from >= at && from < at + node.length)!;
  const end = nodes.find(({ node, at }) => to > at && to <= at + node.length)!;
  const range = document.createRange();
  range.setStart(start.node, from - start.at);
  range.setEnd(end.node, to - end.at);
  return range;
}

/** Highlights `rendered` the way the app does, and returns the marks it renders. */
function highlight(source: string, rendered: string) {
  const root = mount(source);
  const selection = toSourceSelection(select(root, rendered), root, source)!;
  const placed = placeHighlights(source, [createHighlight(selection, "green")]);
  const marked = mount(source, placed);
  return [...marked.querySelectorAll<HTMLElement>("mark[data-highlight]")];
}

/** The text the marks cover, joined with "|" between marks. */
function markedText(marks: HTMLElement[]): string {
  return marks.map((mark) => mark.textContent).join("|");
}

describe("highlights render across element boundaries", () => {
  it("marks plain text with one mark", () => {
    const marks = highlight("A process is a program in execution.\n", "a program");
    expect(markedText(marks)).toBe("a program");
    expect(marks[0].className).toBe("highlight highlight-green");
  });

  it("splits at formatting without breaking it", () => {
    const marks = highlight("A *process* is a program in **execution**.\n", "process is a program");
    expect(markedText(marks)).toBe("process| is a program");
    expect(marks[0].parentElement!.tagName).toBe("EM");
  });

  it("spans two paragraphs", () => {
    const marks = highlight("First paragraph ends.\n\nSecond one starts.\n", "ends.\nSecond");
    expect(markedText(marks)).toBe("ends.|Second");
    expect(marks.map((m) => m.closest("p")!.textContent)).toEqual([
      "First paragraph ends.",
      "Second one starts.",
    ]);
  });

  it("spans list items without marking the whitespace between them", () => {
    const marks = highlight("- alpha one\n- beta two\n- gamma three\n", "one\nbeta two\ngamma");
    expect(markedText(marks)).toBe("one|beta two|gamma");
    expect(marks.every((m) => m.closest("li"))).toBe(true);
  });

  it("marks inside a highlighted code block", () => {
    const source = "```js\nconst answer = 42;\nconsole.log(answer);\n```\n";
    const marks = highlight(source, "answer = 42;\nconsole");
    expect(markedText(marks).replace(/\|/g, "")).toBe("answer = 42;\nconsole");
    expect(marks.every((m) => m.closest("code"))).toBe(true);
  });

  it("spans table cells", () => {
    const marks = highlight("| a | b |\n| - | - |\n| one | two |\n", "onetwo");
    expect(markedText(marks)).toBe("one|two");
    expect(marks.map((m) => m.parentElement!.tagName)).toEqual(["TD", "TD"]);
  });

  it("marks an entity as the character it renders", () => {
    const marks = highlight("Copyright &copy; 2026 me\n", "© 2026");
    expect(markedText(marks)).toBe("© 2026");
  });

  it("leaves the source offsets on the elements, so selections still map", () => {
    const source = "A *process* is a program in **execution**.\n";
    const placed: PlacedHighlight[] = [{ id: "h", start: 3, end: 18, color: "yellow" }];
    const root = mount(source, placed);
    const selection = toSourceSelection(select(root, "program in exec"), root, source);
    expect(selection?.quote).toBe("program in **exec");
  });
});

describe("applyHighlights", () => {
  const source = "One two three four.\n";

  it("returns the same tree when there are no highlights", () => {
    const tree = markdownToHast(source);
    expect(applyHighlights(tree, source, [])).toBe(tree);
  });

  it("doesn't change the tree it was given", () => {
    const tree = markdownToHast(source);
    const before = JSON.stringify(tree);
    applyHighlights(tree, source, [{ id: "h", start: 4, end: 7, color: "yellow" }]);
    expect(JSON.stringify(tree)).toBe(before);
  });

  it("lets the later of two overlapping highlights win", () => {
    const root = mount(source, [
      { id: "a", start: 0, end: 13, color: "yellow" },
      { id: "b", start: 8, end: 18, color: "pink" },
    ]);
    const marks = [...root.querySelectorAll("mark")].map((m) => [
      m.getAttribute("data-highlight"),
      m.textContent,
    ]);
    expect(marks).toEqual([
      ["a", "One two "],
      ["b", "three four"],
    ]);
  });

  it("outlines the active highlight", () => {
    const root = mount(source, [{ id: "a", start: 4, end: 7, color: "yellow", active: true }]);
    expect(root.querySelector("mark")!.hasAttribute("data-active")).toBe(true);
  });
});
