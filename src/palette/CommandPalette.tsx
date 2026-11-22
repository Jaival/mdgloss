import { useEffect, useMemo, useState } from "react";
import { FileText, Hash, Terminal } from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { isPaletteShortcut, isTextEntry } from "@/lib/keys";
import { cn } from "@/lib/utils";
import { HIGHLIGHT_FILL } from "../annotations/colors";
import type { Highlight } from "../annotations/types";
import type { TreeNode } from "../files/tree";
import type { ThemeSetting } from "../theme";
import type { Heading } from "../markdown/headings";
import { buildGroups, filterGroups, type CommandId, type PaletteItem } from "./items";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The open folder's tree, or the single open file. */
  tree: TreeNode[];
  /** The open document's headings; null when no document is open. */
  headings: readonly Heading[] | null;
  /** The open file's highlights shown in the reader, in document order. */
  highlights: Highlight[];
  theme: ThemeSetting;
  /** Whether focus mode is on. */
  focus: boolean;
  onShowFile: (path: string) => void;
  /** Scroll to the heading that starts at this source offset. */
  onShowHeading: (offset: number) => void;
  onShowHighlight: (id: string) => void;
  onCommand: (command: CommandId) => void;
}

/**
 * The Ctrl/Cmd+K palette (docs/DESIGN.md section 8): jump to a heading, file or
 * note, or run a command. Item building and filtering live in items.ts.
 */
export function CommandPalette({
  open,
  onOpenChange,
  tree,
  headings,
  highlights,
  theme,
  focus,
  onShowFile,
  onShowHeading,
  onShowHighlight,
  onCommand,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isPaletteShortcut(event) || event.repeat) return;
      // Leaving a text field (the comment popover) would close and save it.
      if (!open && isTextEntry(event.target)) return;
      event.preventDefault();
      if (open) setQuery("");
      onOpenChange(!open);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  const groups = useMemo(
    () =>
      filterGroups(
        buildGroups({
          tree,
          headings: headings ?? [],
          highlights,
          hasDocument: headings !== null,
          theme,
          focus,
        }),
        query,
      ),
    [tree, headings, highlights, theme, focus, query],
  );

  function changeOpen(next: boolean) {
    if (!next) setQuery("");
    onOpenChange(next);
  }

  function select(item: PaletteItem) {
    changeOpen(false);
    switch (item.kind) {
      case "heading":
        onShowHeading(item.offset);
        break;
      case "file":
        onShowFile(item.path);
        break;
      case "note":
        onShowHighlight(item.highlightId);
        break;
      case "command":
        onCommand(item.command);
        break;
    }
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={changeOpen}
      title="Command palette"
      description="Jump to a heading, file or note, or run a command."
    >
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Search headings, files, notes, commands…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          {groups.map((group) => (
            <CommandGroup key={group.heading} heading={group.heading}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.id}
                  onSelect={() => select(item)}
                  data-checked={item.kind === "command" ? item.checked : undefined}
                >
                  {item.kind === "heading" && (
                    <Hash style={{ marginLeft: `${(item.depth - 1) * 0.75}rem` }} />
                  )}
                  {item.kind === "file" && <FileText />}
                  {item.kind === "note" && (
                    <span
                      aria-hidden
                      className={cn("size-2 shrink-0 rounded-full", HIGHLIGHT_FILL[item.color])}
                    />
                  )}
                  {item.kind === "command" && <Terminal />}
                  <span className="min-w-0 truncate">{item.label}</span>
                  {"detail" in item && item.detail && (
                    <span className="ml-auto max-w-[45%] shrink-0 truncate text-xs text-muted-foreground">
                      {item.detail}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
