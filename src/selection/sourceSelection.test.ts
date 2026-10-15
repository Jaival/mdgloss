// @vitest-environment happy-dom
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Markdown } from "../markdown/Markdown";
import { alignText } from "./align";
import { CONTEXT_LENGTH, toSourceSelection } from "./sourceSelection";

/** Renders markdown into the test document and returns its root element. */
function mount(source: string): HTMLElement {
  document.body.innerHTML = `<article>${renderToStaticMarkup(
    createElement(Markdown, { source, resolveImageSrc: (src) => src, onLinkClick: () => {} }),
  )}</article>`;
  return document.querySelector("article")!;
}

/** Every text node in `root` with where it starts in the concatenated text. */
function textNodes(root: Node) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: { node: Text; at: number }[] = [];
  let at = 0;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    nodes.push({ node: node as Text, at });
    at += node.textContent!.length;
  }
  return { nodes, text: nodes.map(({ node }) => node.textContent).join("") };
}

/** The DOM point at index `i` of the concatenated rendered text. */
function pointAt(root: Node, i: number, side: "start" | "end"): [Text, number] {
  const { nodes } = textNodes(root);
  const hit =
    side === "start"
      ? nodes.find(({ node, at }) => i >= at && i < at + node.length)
      : nodes.find(({ node, at }) => i > at && i <= at + node.length);
  return [hit!.node, i - hit!.at];
}

/** Selects the `nth` occurrence of `rendered` the way a user's drag would. */
function select(root: HTMLElement, rendered: string, nth = 0): Range {
  const { text } = textNodes(root);
  let from = -1;
  for (let n = 0; n <= nth; n++) from = text.indexOf(rendered, from + 1);
  if (from === -1)
    throw new Error(`"${rendered}" is not in the rendered text: ${JSON.stringify(text)}`);
  const range = document.createRange();
  range.setStart(...pointAt(root, from, "start"));
  range.setEnd(...pointAt(root, from + rendered.length, "end"));
  return range;
}

/** Selects `rendered` in markdown `source` and returns the quoted source. */
function quote(source: string, rendered: string, nth = 0): string | undefined {
  const root = mount(source);
  return toSourceSelection(select(root, rendered, nth), root, source)?.quote;
}

describe("fixtures: a selection in the preview maps to the source", () => {
  it("1. plain text", () => {
    expect(quote("A process is a program in execution.\n", "a program")).toBe("a program");
  });

  it("2. formatting inside the selection keeps its markers", () => {
    expect(
      quote("A *process* is a program in **execution**.\n", "process is a program in execution"),
    ).toBe("process* is a program in **execution");
  });

  it("3. a selection that starts and ends inside formatting", () => {
    expect(quote("Read the ***really important*** part.\n", "ally impor")).toBe("ally impor");
  });

  it("4. links quote their text, or the whole link when spanned", () => {
    const source = "See [the docs](https://example.com/docs) first.\n";
    expect(quote(source, "docs")).toBe("docs");
    expect(quote(source, "See the docs first")).toBe(
      "See [the docs](https://example.com/docs) first",
    );
  });

  it("5. a selection spanning list items", () => {
    expect(quote("- one\n- two\n- three\n", "ne\ntw")).toBe("ne\n- tw");
  });

  it("6. nested and numbered lists", () => {
    const source = "1. Intro\n   - detail **a**\n   - detail b\n2. Next\n";
    expect(quote(source, "a\ndetail b\n\n\nNe")).toBe("a**\n   - detail b\n2. Ne");
  });

  it("7. inside a highlighted code block", () => {
    const source = "Before\n\n```ts\nconst total = items.length;\nreturn total;\n```\n";
    expect(quote(source, "items.length;\nreturn")).toBe("items.length;\nreturn");
  });

  it("8. from a paragraph into a code block", () => {
    const source = "Run this:\n\n```sh\nbun install\n```\n";
    expect(quote(source, "this:\nbun")).toBe("this:\n\n```sh\nbun");
  });

  it("9. inline code", () => {
    expect(quote("Call `useMemo()` once.\n", "useMemo()")).toBe("useMemo()");
    expect(quote("Call `useMemo()` once.\n", "Call useMemo")).toBe("Call `useMemo");
  });

  it("10. table cells and rows", () => {
    const source = "| Algo | Cost |\n| ---- | ---- |\n| FCFS | low |\n| RR | `q` |\n";
    expect(quote(source, "low")).toBe("low");
    expect(quote(source, "FCFSlow")).toBe("FCFS | low");
    expect(quote(source, "lowRR")).toBe("low |\n| RR");
  });

  it("11. escaped characters", () => {
    expect(quote("Use \\*literal\\* stars.\n", "*literal*")).toBe("\\*literal\\*");
  });

  it("12. HTML entities", () => {
    expect(quote("Copyright &copy; 2026 &amp; later.\n", "© 2026 & later")).toBe(
      "&copy; 2026 &amp; later",
    );
  });

  it("13. blockquotes spanning lines", () => {
    expect(quote("> first line\n> second line\n", "line\nsecond")).toBe("line\n> second");
  });

  it("14. headings", () => {
    expect(quote("## Priority Scheduling\n\nText.\n", "Scheduling\nText")).toBe(
      "Scheduling\n\nText",
    );
  });

  it("15. the second of two identical words", () => {
    const source = "the cat and the dog\n";
    const root = mount(source);
    const selection = toSourceSelection(select(root, "the", 1), root, source)!;
    expect(selection).toMatchObject({ start: 12, end: 15, quote: "the" });
  });

  it("16. text around an Obsidian image embed", () => {
    expect(quote("Before ![[diagram.png]] after.\n", "after")).toBe("after");
  });

  it("17. Windows line endings", () => {
    expect(quote("- one\r\n- two\r\n", "one\ntwo")).toBe("one\r\n- two");
  });

  it("18. characters outside the BMP", () => {
    expect(quote("Done 🎉 today\n", "🎉 today")).toBe("🎉 today");
  });

  it("19. footnote numbers are skipped", () => {
    const source = "Claim[^1] here.\n\n[^1]: Source.\n";
    const root = mount(source);
    // Ends on the generated "1": the selection shrinks to the source text before it.
    const range = document.createRange();
    const sup = root.querySelector("sup a")!.firstChild as Text;
    range.setStart(...pointAt(root, 0, "start"));
    range.setEnd(sup, 1);
    expect(toSourceSelection(range, root, source)?.quote).toBe("Claim");
  });
});

describe("selection edges", () => {
  it("adds 32 characters of context on each side, clipped at the ends", () => {
    const source = `${"a".repeat(40)} target ${"b".repeat(40)}\n`;
    const root = mount(source);
    const selection = toSourceSelection(select(root, "target"), root, source)!;
    expect(selection.prefix).toBe(`${"a".repeat(CONTEXT_LENGTH - 1)} `);
    expect(selection.suffix).toBe(` ${"b".repeat(CONTEXT_LENGTH - 1)}`);

    const short = toSourceSelection(
      select(mount("hi there\n"), "hi"),
      document.querySelector("article")!,
      "hi there\n",
    )!;
    expect(short.prefix).toBe("");
    expect(short.suffix).toBe(" there\n");
  });

  it("leaves surrounding whitespace out of the quote", () => {
    expect(quote("one two three\n", " two ")).toBe("two");
  });

  it("maps element boundaries, as a triple click makes", () => {
    const source = "First paragraph.\n\nSecond.\n";
    const root = mount(source);
    const [first, second] = root.querySelectorAll("p");
    const range = document.createRange();
    range.setStart(first, 0);
    range.setEnd(second, 0);
    expect(toSourceSelection(range, root, source)?.quote).toBe("First paragraph.");
  });

  it("returns null for empty, whitespace-only and outside selections", () => {
    const source = "one two\n";
    const root = mount(source);
    const empty = document.createRange();
    empty.setStart(...pointAt(root, 1, "start"));
    expect(toSourceSelection(empty, root, source)).toBeNull();
    expect(toSourceSelection(select(root, " "), root, source)).toBeNull();

    const outside = document.createElement("p");
    outside.textContent = "elsewhere";
    document.body.append(outside);
    const range = document.createRange();
    range.selectNodeContents(outside);
    expect(toSourceSelection(range, root, source)).toBeNull();
  });
});

describe("alignText", () => {
  it("skips markup between characters", () => {
    expect(alignText("ab", "a\\*b", 0, 4)).toEqual([
      { start: 0, end: 1 },
      { start: 3, end: 4 },
    ]);
  });

  it("maps an entity as a whole", () => {
    expect(alignText("©x", "&copy;x", 0, 7)).toEqual([
      { start: 0, end: 6 },
      { start: 6, end: 7 },
    ]);
  });

  it("gives characters missing from the source an empty range", () => {
    expect(alignText("a↩", "a", 0, 1)).toEqual([
      { start: 0, end: 1 },
      { start: 1, end: 1 },
    ]);
  });
});

describe("large documents", () => {
  it("maps a selection in a 20,000-line code block quickly", () => {
    const lines = Array.from({ length: 20000 }, (_, i) => `line ${i} &amp; more`);
    const source = `\`\`\`\n${lines.join("\n")}\n\`\`\`\n`;
    const root = mount(source);
    const began = performance.now();
    expect(toSourceSelection(select(root, "line 19999"), root, source)?.quote).toBe("line 19999");
    expect(performance.now() - began).toBeLessThan(500);
  });
});

describe("code is literal", () => {
  it("keeps entities and escapes in code as written", () => {
    expect(quote("```\na &amp; \\*b\n```\n", "&amp; \\*b")).toBe("&amp; \\*b");
    expect(quote("Use `&lt;` here\n", "&lt;")).toBe("&lt;");
  });
});

describe("alignText in literal mode", () => {
  it("does not decode entities", () => {
    expect(alignText("&amp;", "&amp;", 0, 5, true)).toHaveLength(5);
  });
});
