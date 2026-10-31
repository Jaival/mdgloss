import { useEffect } from "react";
import { Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { isTextEntry } from "@/lib/keys";
import { cn } from "@/lib/utils";
import { HIGHLIGHT_COLORS, type HighlightColor } from "./types";

const COLOR_NAMES: Record<HighlightColor, string> = {
  yellow: "Yellow",
  green: "Green",
  pink: "Pink",
  purple: "Purple",
};

const SWATCH: Record<HighlightColor, string> = {
  yellow: "bg-highlight-yellow",
  green: "bg-highlight-green",
  pink: "bg-highlight-pink",
  purple: "bg-highlight-purple",
};

interface HighlightToolbarProps {
  /** The selection or highlight to sit above, in viewport coordinates. */
  anchor: DOMRect;
  /** The colour of the highlight being edited; absent for a new selection. */
  color?: HighlightColor;
  onPick: (color: HighlightColor) => void;
  /** Shown only when editing an existing highlight. */
  onDelete?: () => void;
  onDismiss: () => void;
}

/**
 * The floating toolbar above a selection or a clicked highlight
 * (docs/DESIGN.md section 8). Keys: 1–4 pick a colour, Delete removes, Esc closes.
 */
export function HighlightToolbar({
  anchor,
  color,
  onPick,
  onDelete,
  onDismiss,
}: HighlightToolbarProps) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey || isTextEntry(event.target)) return;
      const index = Number(event.key) - 1;
      if (Number.isInteger(index) && HIGHLIGHT_COLORS[index]) {
        event.preventDefault();
        onPick(HIGHLIGHT_COLORS[index]);
      } else if (event.key === "Escape") {
        onDismiss();
      } else if (onDelete && (event.key === "Delete" || event.key === "Backspace")) {
        event.preventDefault();
        onDelete();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onPick, onDelete, onDismiss]);

  // Above the anchor, or below it when there's no room at the top of the window.
  const above = anchor.top > 56;
  const style = {
    left: Math.max(8, Math.min(anchor.left + anchor.width / 2, window.innerWidth - 8)),
    top: above ? anchor.top - 8 : anchor.bottom + 8,
  };

  return (
    <div
      role="toolbar"
      aria-label={onDelete ? "Edit highlight" : "Highlight selection"}
      className={cn(
        "fixed z-50 flex items-center gap-1 rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        "-translate-x-1/2",
        above && "-translate-y-full",
      )}
      style={style}
      // Keep the text selection (and focus in the document) while clicking.
      onMouseDown={(event) => event.preventDefault()}
    >
      {HIGHLIGHT_COLORS.map((option, i) => (
        <Tooltip key={option}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={COLOR_NAMES[option]}
              aria-pressed={option === color}
              onClick={() => onPick(option)}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full border border-foreground/15",
                  SWATCH[option],
                )}
              >
                {option === color && <Check className="size-3" />}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {COLOR_NAMES[option]} <Kbd>{i + 1}</Kbd>
          </TooltipContent>
        </Tooltip>
      ))}
      {onDelete && (
        <>
          <Separator orientation="vertical" className="mx-0.5 h-5" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Delete highlight"
                onClick={onDelete}
              >
                <Trash2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Delete <Kbd>Del</Kbd>
            </TooltipContent>
          </Tooltip>
        </>
      )}
    </div>
  );
}
