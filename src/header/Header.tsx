import {
  BookOpen,
  Download,
  HardDrive,
  Highlighter,
  Monitor,
  Moon,
  PanelRight,
  Settings,
  Sun,
  Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { OrphanList } from "../annotations/OrphanList";
import type { Highlight } from "../annotations/types";
import { isThemeSetting, type ThemeSetting } from "../theme";
import { breadcrumb, countLabel } from "./breadcrumb";

interface HeaderProps {
  /** The open file's path, or null when no file is open. */
  path: string | null;
  /** The open folder; null when a single file is open. */
  root: string | null;
  /** The open file's annotations are kept in app storage, not a .mdgloss folder. */
  appStorage: boolean;
  error: string | null;
  /** The version of a downloaded update, or null when none is ready. */
  updateVersion: string | null;
  onInstallUpdate: () => void;
  notesOpen: boolean;
  onToggleNotes: () => void;
  theme: ThemeSetting;
  onThemeChange: (setting: ThemeSetting) => void;
  onOpenSettings: () => void;
  onEnterFocus: () => void;
  /** Highlights shown in the reader. */
  highlightCount: number;
  /** Highlights whose text couldn't be found in the file. */
  orphaned: Highlight[];
  onDeleteOrphan: (id: string) => void;
}

const THEME_ICONS = { system: Monitor, light: Sun, dark: Moon, sepia: BookOpen };

/** A small rounded label in the header (docs/DESIGN.md section 8). */
const CHIP =
  "flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs [&_svg]:size-3.5";

/**
 * The reader's header (docs/DESIGN.md sections 5 and 8): sidebar toggle,
 * breadcrumb, highlight and orphan chips, then the update, notes, focus-mode,
 * theme and settings buttons.
 */
export function Header({
  path,
  root,
  appStorage,
  error,
  updateVersion,
  onInstallUpdate,
  notesOpen,
  onToggleNotes,
  theme,
  onThemeChange,
  onOpenSettings,
  onEnterFocus,
  highlightCount,
  orphaned,
  onDeleteOrphan,
}: HeaderProps) {
  const ThemeIcon = THEME_ICONS[theme];
  const crumb = path ? breadcrumb(path, root) : null;

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <SidebarTrigger aria-label="Toggle sidebar" />
        </TooltipTrigger>
        <TooltipContent>
          Toggle sidebar{" "}
          <KbdGroup>
            <Kbd>Ctrl</Kbd>
            <Kbd>B</Kbd>
          </KbdGroup>
        </TooltipContent>
      </Tooltip>
      <Separator orientation="vertical" className="h-4" />
      {crumb ? (
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center text-sm"
          title={path ?? undefined}
        >
          {crumb.folders.length > 0 && (
            <span className="min-w-0 shrink-[4] truncate pr-1 text-muted-foreground">
              {crumb.folders.join(" / ")} /
            </span>
          )}
          <span className="min-w-0 truncate font-medium" aria-current="page">
            {crumb.file}
          </span>
        </nav>
      ) : (
        <span className="text-sm text-muted-foreground">mdgloss</span>
      )}
      {path && appStorage && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className="flex shrink-0 items-center text-muted-foreground"
              tabIndex={0}
              aria-label="Annotations kept in app storage"
            >
              <HardDrive className="size-4" />
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-64">
            This file&apos;s folder can&apos;t be written, so its annotations are kept in the
            app&apos;s own storage instead of a .mdgloss folder next to it.
          </TooltipContent>
        </Tooltip>
      )}
      {error && (
        <span className="min-w-0 truncate text-sm text-destructive" role="alert" title={error}>
          {error}
        </span>
      )}
      <span className="ml-auto" />
      {path && highlightCount > 0 && (
        <span className={CHIP}>
          <Highlighter aria-hidden />
          {countLabel(highlightCount, "highlight", "highlights")}
        </span>
      )}
      {path && orphaned.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`${CHIP} text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring`}
            >
              <Unlink aria-hidden />
              {orphaned.length} not found
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            aria-labelledby="orphans-title"
            className="w-80 gap-0 rounded-md p-0"
          >
            <h2
              id="orphans-title"
              className="flex items-center gap-1.5 px-4 pt-3 pb-1 text-sm font-medium"
            >
              <Unlink className="size-4 text-muted-foreground" />
              Text not found
              <span className="text-muted-foreground">{orphaned.length}</span>
            </h2>
            <ScrollArea className="[&>[data-slot=scroll-area-viewport]]:max-h-96">
              <div className="px-3 pb-3">
                <OrphanList orphaned={orphaned} onDelete={onDeleteOrphan} />
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      )}
      {updateVersion && (
        <Button variant="outline" size="sm" className="shrink-0" onClick={onInstallUpdate}>
          <Download data-icon="inline-start" />
          Restart to update to {updateVersion}
        </Button>
      )}
      {path && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle notes"
              aria-pressed={notesOpen}
              onClick={onToggleNotes}
            >
              <PanelRight />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle notes</TooltipContent>
        </Tooltip>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Enter focus mode" onClick={onEnterFocus}>
            <BookOpen />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Focus mode{" "}
          <KbdGroup>
            <Kbd>Ctrl</Kbd>
            <Kbd>.</Kbd>
          </KbdGroup>
        </TooltipContent>
      </Tooltip>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Theme">
            <ThemeIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={theme}
            onValueChange={(value) => isThemeSetting(value) && onThemeChange(value)}
          >
            <DropdownMenuRadioItem value="system">
              <Monitor />
              System
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="light">
              <Sun />
              Light
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">
              <Moon />
              Dark
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="sepia">
              <BookOpen />
              Sepia
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Settings" onClick={onOpenSettings}>
            <Settings />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Settings</TooltipContent>
      </Tooltip>
    </header>
  );
}
