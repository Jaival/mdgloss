import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Highlight } from "../annotations/types";
import { MarginNotes } from "./MarginNotes";

function highlight(id: string, fields: Partial<Highlight> = {}): Highlight {
  return {
    id,
    quote: "spaced recall",
    prefix: "",
    suffix: "",
    offset: 0,
    color: "green",
    comment: null,
    status: "anchored",
    created: "2026-11-20T10:00:00.000Z",
    updated: "2026-11-20T10:00:00.000Z",
    ...fields,
  };
}

function render(highlights: Highlight[]): string {
  return renderToStaticMarkup(
    createElement(MarginNotes, {
      highlights,
      article: { current: null },
      activeId: null,
      onSelect: () => {},
      onEditComment: () => {},
      onDelete: () => {},
    }),
  );
}

describe("MarginNotes", () => {
  it("shows a card for a commented highlight and a dot for one without", () => {
    const html = render([
      highlight("a", { comment: "Check the 2019 replication." }),
      highlight("b", { color: "pink" }),
    ]);
    expect(html).toContain("Check the 2019 replication.");
    expect(html).toContain("border-l-highlight-green");
    expect(html).toContain('aria-label="Highlight: spaced recall"');
    expect(html).toContain("bg-highlight-pink");
  });

  it("clamps comments until expanded and hides boxes until they are placed", () => {
    const html = render([highlight("a", { comment: "Long thought." })]);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("line-clamp-4");
    expect(html).toContain("invisible");
  });
});
