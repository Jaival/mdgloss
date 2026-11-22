import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { flushSync } from "react-dom";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CardMenu } from "../annotations/CardMenu";
import { HIGHLIGHT_BORDER, HIGHLIGHT_FILL } from "../annotations/colors";
import type { Highlight } from "../annotations/types";
import { layoutMargin, type MarginItem } from "./layout";

/** Space between two cards, and between two dots, in px. */
const CARD_GAP = 8;
const DOT_GAP = 2;

const DATE = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });

interface MarginNotesProps {
  /** The highlights shown in the reader, in document order. */
  highlights: Highlight[];
  /** The rendered document, holding the highlights' <mark>s. */
  article: RefObject<HTMLElement | null>;
  /** The highlight the toolbar or comment popover is acting on. */
  activeId: string | null;
  /** A dot was clicked: act on the highlight whose first mark is `mark`. */
  onSelect: (id: string, mark: Element) => void;
  onEditComment: (id: string, mark: Element) => void;
  onDelete: (id: string) => void;
  className?: string;
}

function firstMark(article: HTMLElement, id: string): Element | null {
  return article.querySelector(`mark[data-highlight="${CSS.escape(id)}"]`);
}

/**
 * The right margin beside the document (docs/DESIGN.md section 5): a comment
 * card next to each commented highlight, a dot next to each other one. The
 * placement maths is layoutMargin; this measures the marks and boxes and
 * re-lays them whenever the document, the margin or a card changes size.
 */
export function MarginNotes({
  highlights,
  article,
  activeId,
  onSelect,
  onEditComment,
  onDelete,
  className,
}: MarginNotesProps) {
  const marginRef = useRef<HTMLElement>(null);
  const boxes = useRef(new Map<string, HTMLElement>());
  const [tops, setTops] = useState(new Map<string, number>());
  const [expanded, setExpanded] = useState(new Set<string>());

  const relayout = useEffectEvent(() => {
    const margin = marginRef.current;
    const doc = article.current;
    // Hidden (narrow reader): nothing to measure until it shows again.
    if (!margin || !doc || margin.offsetParent === null) return;
    const origin = margin.getBoundingClientRect().top;
    const cards: (MarginItem & { id: string })[] = [];
    const dots: (MarginItem & { id: string })[] = [];
    for (const h of highlights) {
      const line = firstMark(doc, h.id)?.getClientRects()[0];
      const box = boxes.current.get(h.id);
      if (!line || !box) continue;
      const height = box.offsetHeight;
      if (h.comment) cards.push({ id: h.id, anchor: line.top - origin, height });
      // A dot sits in the middle of the line its highlight starts on.
      else dots.push({ id: h.id, anchor: line.top - origin + (line.height - height) / 2, height });
    }
    const next = new Map<string, number>();
    layoutMargin(cards, CARD_GAP).forEach((top, i) => next.set(cards[i].id, top));
    layoutMargin(dots, DOT_GAP).forEach((top, i) => next.set(dots[i].id, top));
    setTops(next);
  });

  // Before paint, so a changed document never shows its cards in the old places.
  useLayoutEffect(() => relayout(), [highlights]);

  // Resizing the window or the sidebar, a font or size change, images loading,
  // the margin showing again, a card expanding: anything that moves the marks
  // or changes a box's height resizes one of these.
  useEffect(() => {
    // Observer callbacks run before paint; flush so the cards move in the same frame.
    const observer = new ResizeObserver(() => flushSync(relayout));
    if (article.current) observer.observe(article.current);
    if (marginRef.current) observer.observe(marginRef.current);
    for (const box of boxes.current.values()) observer.observe(box);
    return () => observer.disconnect();
  }, [article, highlights]);

  function toggle(id: string) {
    setExpanded((shown) => {
      const next = new Set(shown);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  function withMark(id: string, act: (mark: Element) => void) {
    const mark = article.current && firstMark(article.current, id);
    if (mark) act(mark);
  }

  return (
    <aside ref={marginRef} aria-label="Margin notes" className={cn("relative", className)}>
      {highlights.map((h) => {
        const top = tops.get(h.id);
        const place = {
          ref: (box: HTMLElement | null) => {
            if (!box) return;
            boxes.current.set(h.id, box);
            return () => void boxes.current.delete(h.id);
          },
          style: { top },
        };
        const hidden = top === undefined && "invisible";

        if (!h.comment) {
          return (
            <button
              key={h.id}
              {...place}
              type="button"
              aria-label={`Highlight: ${h.quote}`}
              title={h.quote}
              className={cn(
                "absolute left-0 flex size-4 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring",
                hidden,
              )}
              onClick={() => withMark(h.id, (mark) => onSelect(h.id, mark))}
            >
              <span
                className={cn(
                  "size-2 rounded-full border border-foreground/15",
                  HIGHLIGHT_FILL[h.color],
                  h.id === activeId && "ring-2 ring-primary",
                )}
              />
            </button>
          );
        }

        const open = expanded.has(h.id);
        return (
          <Card
            key={h.id}
            {...place}
            size="sm"
            className={cn(
              "absolute right-0 left-5 gap-0 rounded-md border-l-3 py-0",
              HIGHLIGHT_BORDER[h.color],
              h.id === activeId && "ring-2 ring-primary",
              hidden,
            )}
          >
            <button
              type="button"
              aria-expanded={open}
              className="flex flex-col gap-1 rounded-md p-2.5 pr-9 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => toggle(h.id)}
            >
              <span className={cn("leading-snug whitespace-pre-wrap", !open && "line-clamp-4")}>
                {h.comment}
              </span>
              <time dateTime={h.updated} className="text-xs text-muted-foreground">
                {DATE.format(new Date(h.updated))}
              </time>
            </button>
            <CardMenu
              className="absolute top-1 right-1"
              commented
              onEditComment={() => withMark(h.id, (mark) => onEditComment(h.id, mark))}
              onDelete={() => onDelete(h.id)}
            />
          </Card>
        );
      })}
    </aside>
  );
}
