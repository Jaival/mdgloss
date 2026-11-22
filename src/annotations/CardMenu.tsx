import { useRef } from "react";
import { Ellipsis, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface CardMenuProps {
  commented: boolean;
  onEditComment: () => void;
  onDelete: () => void;
  className?: string;
}

/** A comment card's overflow menu: add or edit the comment, delete the highlight. */
export function CardMenu({ commented, onEditComment, onDelete, className }: CardMenuProps) {
  // "Edit comment" moves focus to the comment popover; the menu mustn't take it back.
  const keepFocus = useRef(false);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("size-7", className)}
          aria-label="Highlight actions"
        >
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onCloseAutoFocus={(event) => {
          if (keepFocus.current) event.preventDefault();
          keepFocus.current = false;
        }}
      >
        <DropdownMenuItem
          onSelect={() => {
            keepFocus.current = true;
            onEditComment();
          }}
        >
          <MessageSquare />
          {commented ? "Edit comment" : "Add comment"}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
