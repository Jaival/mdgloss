import { useEffect, useRef, useState, type RefObject } from "react";
import {
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { headingInView, type Heading } from "../markdown/headings";

/** A heading counts as in view once its top passes this far below the reader's top. */
const VIEW_LINE = 80;

/** Searched inside the reader: a heading id like "root" can match other ids on the page. */
function findHeading(root: HTMLElement | null, id: string): Element | null | undefined {
  return root?.querySelector(`#${CSS.escape(id)}`);
}

interface OutlineProps {
  headings: readonly Heading[];
  /** Highlights in each heading's section, by index. */
  counts: readonly number[];
  /** The reader's scroll area, which holds the rendered headings. */
  scrollRoot: RefObject<HTMLElement | null>;
}

/** The document's headings, indented by depth. Marks the one in view; a click scrolls to it. */
export function Outline({ headings, counts, scrollRoot }: OutlineProps) {
  const [current, setCurrent] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const root = scrollRoot.current;
    if (!root) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const top = root.getBoundingClientRect().top;
      const tops = headings.map(
        (h) => (findHeading(root, h.id)?.getBoundingClientRect().top ?? Infinity) - top,
      );
      setCurrent(headingInView(tops, VIEW_LINE));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      root.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [headings, scrollRoot]);

  // Keep the marked heading visible in a long outline.
  useEffect(() => {
    listRef.current?.querySelector("[data-active]")?.scrollIntoView({ block: "nearest" });
  }, [current]);

  if (headings.length === 0) {
    return <p className="px-2 text-xs text-muted-foreground">No headings in this file.</p>;
  }

  const top = Math.min(...headings.map((h) => h.depth));

  function goTo(id: string) {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    findHeading(scrollRoot.current, id)?.scrollIntoView({
      block: "start",
      behavior: still ? "auto" : "smooth",
    });
  }

  return (
    <SidebarMenu ref={listRef}>
      {headings.map((heading, i) => (
        <SidebarMenuItem key={heading.id}>
          <SidebarMenuButton
            size="sm"
            isActive={i === current}
            aria-current={i === current ? "location" : undefined}
            className="group-has-data-[sidebar=menu-badge]/menu-item:pr-8 data-active:font-semibold data-active:shadow-[inset_2px_0_var(--primary)]"
            style={{ paddingLeft: `${0.5 + (heading.depth - top) * 0.75}rem` }}
            title={heading.text}
            onClick={() => goTo(heading.id)}
          >
            <span>{heading.text}</span>
          </SidebarMenuButton>
          {counts[i] > 0 && (
            <SidebarMenuBadge
              className="text-muted-foreground"
              aria-label={`${counts[i]} ${counts[i] === 1 ? "note" : "notes"}`}
            >
              {counts[i]}
            </SidebarMenuBadge>
          )}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
