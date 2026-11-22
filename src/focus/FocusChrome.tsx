import { useEffect, useState, type RefObject } from "react";
import { FileText, MessageSquare } from "lucide-react";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import { HIGHLIGHT_FILL } from "../annotations/colors";
import type { Highlight } from "../annotations/types";
import { countLabel } from "../header/breadcrumb";
import { progressLabel, readingProgress, tickPositions, type Tick } from "./reading";

interface FocusChromeProps {
  /** The open file's name, or null when no file is open. */
  fileName: string | null;
  /** The open file's highlights shown in the reader, in document order. */
  highlights: Highlight[];
  /** Words in the open file, for the time left. */
  words: number;
  /** The reader's scroll area. */
  scrollRoot: RefObject<HTMLElement | null>;
  /** The rendered document, holding the highlights' <mark>s. */
  article: RefObject<HTMLElement | null>;
  onOpenPalette: () => void;
  onOpenNotes: () => void;
}

/** A floating rounded label over the reader (mockup B). */
const PILL =
  "absolute z-10 flex items-center gap-1.5 rounded-full border bg-popover/85 px-2.5 py-1 text-xs text-popover-foreground backdrop-blur-sm [&_svg]:size-3.5";
const BUTTON_PILL = `${PILL} outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring`;

/**
 * What focus mode shows over the reader (docs/DESIGN.md section 5): a progress
 * line along the top, the file-name pill that opens the palette, the notes
 * pill, the progress and time left, and a tick per highlight on the right
 * edge. The maths is in reading.ts; this only measures the reader.
 */
export function FocusChrome({
  fileName,
  highlights,
  words,
  scrollRoot,
  article,
  onOpenPalette,
  onOpenNotes,
}: FocusChromeProps) {
  const [progress, setProgress] = useState(0);
  const [ticks, setTicks] = useState<Tick[]>([]);

  useEffect(() => {
    const root = scrollRoot.current;
    const doc = article.current;
    if (!root || !doc) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      setProgress(readingProgress(root.scrollTop, root.scrollHeight, root.clientHeight));
      const origin = root.getBoundingClientRect().top - root.scrollTop;
      const items = highlights.flatMap((h) => {
        const mark = doc.querySelector(`mark[data-highlight="${CSS.escape(h.id)}"]`);
        return mark
          ? [{ id: h.id, color: h.color, top: mark.getBoundingClientRect().top - origin }]
          : [];
      });
      setTicks(tickPositions(items, root.scrollHeight));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    root.addEventListener("scroll", schedule, { passive: true });
    // Window and font changes, images loading, a reload: anything that moves the text.
    const observer = new ResizeObserver(schedule);
    observer.observe(root);
    observer.observe(doc);
    return () => {
      root.removeEventListener("scroll", schedule);
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [scrollRoot, article, highlights, words, fileName]);

  return (
    <>
      {fileName && (
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 left-0 z-10 h-0.5 bg-primary"
          style={{ width: `${progress * 100}%` }}
        />
      )}
      <button
        type="button"
        className={cn(BUTTON_PILL, "top-3 left-3 max-w-[50%]")}
        aria-label={`${fileName ?? "mdgloss"}: open the command palette`}
        title="Command palette"
        onClick={onOpenPalette}
      >
        <FileText aria-hidden />
        <span className="min-w-0 truncate font-medium">{fileName ?? "mdgloss"}</span>
        <KbdGroup>
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </button>
      {fileName && (
        <>
          <span className={cn(PILL, "bottom-3 left-3 text-muted-foreground")}>
            {progressLabel(words, progress)}
          </span>
          <button
            type="button"
            className={cn(BUTTON_PILL, "right-8 bottom-3")}
            title="Notes"
            onClick={onOpenNotes}
          >
            <MessageSquare aria-hidden />
            {countLabel(highlights.length, "note", "notes")}
            <Kbd>N</Kbd>
          </button>
          <div
            aria-hidden
            className="pointer-events-none absolute top-14 right-3 bottom-14 z-10 w-1 rounded-full bg-muted"
          >
            {ticks.map((tick) => (
              <i
                key={tick.id}
                className={cn(
                  "absolute -left-0.5 h-[3px] w-2 -translate-y-1/2 rounded-full",
                  HIGHLIGHT_FILL[tick.color],
                )}
                style={{ top: `${tick.at * 100}%` }}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}
