import { Ellipsis, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CardBody } from "./CardBody";
import type { Highlight } from "./types";

interface OrphanListProps {
  /** Highlights whose text couldn't be found in the file (docs/DESIGN.md section 8). */
  orphaned: Highlight[];
  onDelete: (id: string) => void;
}

/**
 * The "Text not found" list: one muted card per orphaned highlight, with a
 * menu to delete it. Shown in the notes panel and the header's orphan chip.
 */
export function OrphanList({ orphaned, onDelete }: OrphanListProps) {
  return (
    <>
      <p className="px-1 pb-2 text-xs text-muted-foreground">
        The file changed and these quotes are no longer in it.
      </p>
      <ul className="flex flex-col gap-2">
        {orphaned.map((h) => (
          <li key={h.id}>
            <Card size="sm" className="relative gap-0 rounded-md bg-muted py-0">
              <div className="flex flex-col gap-1.5 p-3 pr-10">
                <CardBody highlight={h} />
              </div>
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
                <DropdownMenuContent align="end">
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
    </>
  );
}
