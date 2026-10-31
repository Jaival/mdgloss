import { useRef, useState } from "react";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";

/** Something on screen to sit next to: a highlight's <mark> or a selection's Range. */
export interface Anchor {
  getBoundingClientRect(): DOMRect;
}

interface CommentPopoverProps {
  /** Measured on every frame, so the popover follows its text while the reader scrolls. */
  anchor: Anchor;
  /** The saved comment, if there is one. */
  comment: string | null;
  /** The trimmed text, or null when it's empty. Called on Ctrl/Cmd+Enter, blur and close. */
  onSave: (comment: string | null) => void;
  /** Called on Esc: the draft is dropped. */
  onCancel: () => void;
}

/**
 * Edits one highlight's comment (docs/DESIGN.md section 8). The draft stays here
 * until the popover closes, so a comment is one save, not one per keystroke.
 */
export function CommentPopover({ anchor, comment, onSave, onCancel }: CommentPopoverProps) {
  const [draft, setDraft] = useState(comment ?? "");
  const virtualRef = useRef(anchor);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const discard = useRef(false);
  const closed = useRef(false);

  function close() {
    if (closed.current) return;
    closed.current = true;
    if (discard.current) onCancel();
    else onSave(draft.trim() || null);
  }

  return (
    <Popover open onOpenChange={(open) => !open && close()}>
      <PopoverAnchor virtualRef={virtualRef} />
      <PopoverContent
        side="bottom"
        sideOffset={8}
        hideWhenDetached
        className="w-80 gap-2 rounded-md p-3"
        onOpenAutoFocus={(event) => {
          // Put the caret after an existing comment, not before it.
          event.preventDefault();
          const textarea = textareaRef.current;
          textarea?.focus();
          textarea?.setSelectionRange(textarea.value.length, textarea.value.length);
        }}
        onEscapeKeyDown={() => {
          discard.current = true;
        }}
      >
        <label htmlFor="comment" className="text-xs font-medium text-muted-foreground">
          Comment
        </label>
        <Textarea
          id="comment"
          ref={textareaRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              close();
            }
          }}
          placeholder="Why does this matter?"
          className="max-h-60 py-2"
        />
        <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <KbdGroup>
            <Kbd>Ctrl</Kbd>
            <Kbd>Enter</Kbd>
          </KbdGroup>
          saves, <Kbd>Esc</Kbd> discards
        </p>
      </PopoverContent>
    </Popover>
  );
}
