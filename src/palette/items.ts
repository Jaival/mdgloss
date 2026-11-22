import type { Highlight, HighlightColor } from "../annotations/types";
import type { TreeNode } from "../files/tree";
import type { ThemeSetting } from "../theme";
import type { Heading } from "./headings";

/** What a command does; CommandPalette maps each one to an action. */
export type CommandId =
  "open-file" | "open-folder" | "toggle-notes" | "theme-system" | "theme-light" | "theme-dark";

export type PaletteItem =
  | { kind: "heading"; id: string; label: string; depth: number; offset: number }
  | { kind: "file"; id: string; label: string; detail: string; path: string }
  | {
      kind: "note";
      id: string;
      label: string;
      detail: string;
      color: HighlightColor;
      highlightId: string;
    }
  | { kind: "command"; id: string; label: string; command: CommandId; checked: boolean };

export interface PaletteGroup {
  heading: string;
  items: PaletteItem[];
}

export interface PaletteInput {
  /** The open folder's tree, or the single open file. */
  tree: TreeNode[];
  headings: Heading[];
  /** The open file's highlights shown in the reader, in document order. */
  highlights: Highlight[];
  /** Whether a document is open, so document commands make sense. */
  hasDocument: boolean;
  theme: ThemeSetting;
}

/** Most items shown per group, so a large folder doesn't make the list slow. */
export const GROUP_LIMIT = 50;

function flattenFiles(nodes: TreeNode[], folder: string, out: PaletteItem[]) {
  for (const node of nodes) {
    if (node.kind === "directory") {
      flattenFiles(node.children, folder ? `${folder}/${node.name}` : node.name, out);
    } else {
      out.push({
        kind: "file",
        id: `file:${node.path}`,
        label: node.name,
        detail: folder,
        path: node.path,
      });
    }
  }
}

const oneLine = (text: string) => text.replace(/\s+/g, " ").trim();

function commands({ hasDocument, theme }: PaletteInput): PaletteItem[] {
  const command = (command: CommandId, label: string, checked = false): PaletteItem => ({
    kind: "command",
    id: `command:${command}`,
    label,
    command,
    checked,
  });
  return [
    command("open-file", "Open file…"),
    command("open-folder", "Open folder…"),
    ...(hasDocument ? [command("toggle-notes", "Toggle notes")] : []),
    // UI plan step 6: the focus-mode command ("Enter focus mode" / "Leave focus mode") goes here.
    command("theme-system", "Theme: System", theme === "system"),
    command("theme-light", "Theme: Light", theme === "light"),
    command("theme-dark", "Theme: Dark", theme === "dark"),
  ];
}

/** Every item the palette can show, grouped in display order (mockup C). */
export function buildGroups(input: PaletteInput): PaletteGroup[] {
  const files: PaletteItem[] = [];
  flattenFiles(input.tree, "", files);
  return [
    {
      heading: "Headings",
      items: input.headings.map((h) => ({
        kind: "heading",
        id: `heading:${h.offset}`,
        label: h.text,
        depth: h.depth,
        offset: h.offset,
      })),
    },
    { heading: "Files", items: files },
    {
      heading: "Notes",
      items: input.highlights.map((h) => {
        const quote = oneLine(h.quote);
        const comment = h.comment === null ? "" : oneLine(h.comment);
        return {
          kind: "note",
          id: `note:${h.id}`,
          label: comment || quote,
          detail: comment ? quote : "",
          color: h.color,
          highlightId: h.id,
        };
      }),
    },
    { heading: "Commands", items: commands(input) },
  ];
}

/** Lower is better; undefined means no match. Every word of the query must appear. */
function score(item: PaletteItem, words: string[]): number | undefined {
  const label = item.label.toLowerCase();
  const detail = "detail" in item ? item.detail.toLowerCase() : "";
  let total = 0;
  for (const word of words) {
    const at = label.indexOf(word);
    if (at === 0) continue;
    if (at > 0) total += label[at - 1] === " " ? 1 : 2;
    else if (detail.includes(word)) total += 3;
    else return undefined;
  }
  return total;
}

/**
 * The groups filtered by a query, best matches first, each cut to GROUP_LIMIT.
 * With an empty query the headings are never cut: they are the open file's outline.
 * An empty query keeps everything in its original order. Empty groups are dropped.
 */
export function filterGroups(groups: PaletteGroup[], query: string): PaletteGroup[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return groups.flatMap((group) => {
    const items =
      words.length === 0
        ? group.items
        : group.items
            .flatMap((item, index) => {
              const s = score(item, words);
              return s === undefined ? [] : [{ item, s, index }];
            })
            .sort((a, b) => a.s - b.s || a.index - b.index)
            .map(({ item }) => item);
    const keepAll = words.length === 0 && group.heading === "Headings";
    return items.length > 0
      ? [{ heading: group.heading, items: keepAll ? items : items.slice(0, GROUP_LIMIT) }]
      : [];
  });
}
