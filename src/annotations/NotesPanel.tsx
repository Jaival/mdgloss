import { useRef } from "react";
import { ChevronRight, Ellipsis, MessageSquare, Trash2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CardBody } from "./CardBody";
import { OrphanList } from "./OrphanList";
import type { Highlight } from "./types";

interface NotesPanelProps {
  /** The current file's highlights that are shown in the reader, in document order. */
  highlights: Highlight[];
  /** Highlights whose text couldn't be found in the file (docs/DESIGN.md section 8). */
  orphaned: Highlight[];
  /** Scroll the reader to a highlight. */
  onSelect: (id: string) => void;
  onEditComment: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * The right-hand notes panel (docs/DESIGN.md sections 5 and 8): one card per
 * highlight with its quote and comment, and the orphaned ones in a section
 * at the bottom.
 */
export function NotesPanel({
  highlights,
  orphaned,
  onSelect,
  onEditComment,
  onDelete,
}: NotesPanelProps) {
  // "Edit comment" moves focus to the comment popover; the menu mustn't take it back.
  const keepFocus = useRef(false);

  return (
    <aside aria-label="Notes" className="flex w-80 shrink-0 flex-col border-l">
      <h2 className="flex h-10 shrink-0 items-center px-4 text-sm font-medium">
        Highlights
        {highlights.length > 0 && (
          <span className="ml-1.5 text-muted-foreground">{highlights.length}</span>
        )}
      </h2>
      {highlights.length === 0 && orphaned.length === 0 ? (
        <p className="px-4 text-sm text-muted-foreground">
          No highlights yet. Select text in the document to add one.
        </p>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <ul className="flex flex-col gap-2 px-3 pb-3 empty:hidden">
            {highlights.map((h) => (
              <li key={h.id}>
                <Card size="sm" className="relative gap-0 rounded-md py-0">
                  <button
                    type="button"
                    className="flex flex-col gap-1.5 rounded-md p-3 pr-10 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => onSelect(h.id)}
                  >
                    <CardBody highlight={h} />
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1.5 right-1.5 size-7"
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
                          onEditComment(h.id);
                        }}
                      >
                        <MessageSquare />
                        {h.comment ? "Edit comment" : "Add comment"}
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onSelect={() => onDelete(h.id)}>
                        <Trash2 />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Card>
              </li>
            ))}
          </ul>
          {orphaned.length > 0 && (
            <Collapsible className="px-3 pb-3">
              <CollapsibleTrigger className="group flex w-full items-center gap-1.5 rounded-md px-1 py-1.5 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <ChevronRight className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                <Unlink className="size-4 text-muted-foreground" />
                Text not found
                <span className="text-muted-foreground">{orphaned.length}</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <OrphanList orphaned={orphaned} onDelete={onDelete} />
              </CollapsibleContent>
            </Collapsible>
          )}
        </ScrollArea>
      )}
    </aside>
  );
}
