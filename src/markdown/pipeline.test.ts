import type { Element, Root } from "hast";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { visit } from "unist-util-visit";
import { describe, expect, it } from "vitest";
import { Markdown } from "./Markdown";
import { markdownToHast } from "./pipeline";

function render(source: string, resolveImageSrc = (src: string) => src): string {
  return renderToStaticMarkup(
    createElement(Markdown, { source, resolveImageSrc, onLinkClick: () => {} }),
  );
}

function elements(tree: Root, tagName: string): Element[] {
  const found: Element[] = [];
  visit(tree, "element", (node) => {
    if (node.tagName === tagName) found.push(node);
  });
  return found;
}

/** The markdown source an element was rendered from, using its data attributes. */
function sourceOf(source: string, element: Element): string {
  const start = element.properties.dataSourceStart as number;
  const end = element.properties.dataSourceEnd as number;
  return source.slice(start, end);
}

describe("GitHub-flavoured markdown", () => {
  it("renders tables", () => {
    const html = render("| a | b |\n| - | - |\n| 1 | 2 |\n");
    expect(html).toContain("<table");
    expect(html).toMatch(/<td[^>]*>2<\/td>/);
  });

  it("renders task lists, strikethrough and autolinks", () => {
    const html = render("- [x] done\n- [ ] todo\n\n~~old~~ www.example.com\n");
    expect(html).toMatch(/<input[^>]*type="checkbox"[^>]*checked=""/);
    expect(html).toMatch(/<del[^>]*>old<\/del>/);
    expect(html).toContain('href="http://www.example.com"');
  });

  it("drops raw HTML", () => {
    const html = render('<script>alert("x")</script>\n\ntext <b>bold</b>\n');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<b>");
  });
});

describe("code highlighting", () => {
  it("highlights fenced code with a language", () => {
    const html = render("```ts\nconst x = 1;\n```\n");
    expect(html).toContain("hljs language-ts");
    expect(html).toContain('<span class="hljs-keyword">const</span>');
  });

  it("leaves code without a language unhighlighted", () => {
    const html = render("```\nconst x = 1;\n```\n");
    expect(html).not.toContain("hljs-keyword");
  });
});

describe("source offsets", () => {
  const source = "# Scheduling\n\nA *process* is a program in **execution**.\n\n- one\n- two\n";
  const tree = markdownToHast(source);

  it("maps block elements to their source", () => {
    expect(sourceOf(source, elements(tree, "h1")[0])).toBe("# Scheduling");
    expect(sourceOf(source, elements(tree, "p")[0])).toBe(
      "A *process* is a program in **execution**.",
    );
    expect(sourceOf(source, elements(tree, "ul")[0])).toBe("- one\n- two");
  });

  it("maps inline elements to their source, including the markers", () => {
    expect(sourceOf(source, elements(tree, "em")[0])).toBe("*process*");
    expect(sourceOf(source, elements(tree, "strong")[0])).toBe("**execution**");
    expect(sourceOf(source, elements(tree, "li")[1])).toBe("- two");
  });

  it("writes offsets as data attributes", () => {
    expect(render("# Hi\n")).toContain('data-source-start="0" data-source-end="4"');
  });
});

describe("headings and images", () => {
  it("gives headings GitHub-style ids for anchor links", () => {
    expect(render("## Priority Scheduling\n")).toContain('id="priority-scheduling"');
  });

  it("passes image sources through the resolver", () => {
    const html = render("![diagram](img/a.png)\n", (src) => `asset://${src}`);
    expect(html).toContain('src="asset://img/a.png"');
    expect(html).toContain('alt="diagram"');
  });
});
