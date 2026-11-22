import { cn } from "@/lib/utils";
import { HIGHLIGHT_BORDER } from "./colors";
import type { Highlight } from "./types";

const DATE = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });

/** A card's quote with a border in the highlight's colour, its comment and its date. */
export function CardBody({ highlight: h }: { highlight: Highlight }) {
  return (
    <>
      <span
        className={cn(
          "line-clamp-3 border-l-2 pl-2 text-xs text-muted-foreground",
          HIGHLIGHT_BORDER[h.color],
        )}
      >
        {h.quote}
      </span>
      {h.comment && <span className="whitespace-pre-wrap">{h.comment}</span>}
      <time dateTime={h.updated} className="text-xs text-muted-foreground">
        {DATE.format(new Date(h.updated))}
      </time>
    </>
  );
}
