import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { appDataDir } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-dialog";
import { openUrl, revealItemInDir } from "@tauri-apps/plugin-opener";
import { FileText, FolderOpen, HardDrive, Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CommentPopover, type Anchor } from "./annotations/CommentPopover";
import { createHighlight, placeHighlights } from "./annotations/highlights";
import { HighlightToolbar } from "./annotations/HighlightToolbar";
import { AppDataStore, LocalAnnotationStore, SidecarStore } from "./annotations/store";
import type { HighlightColor } from "./annotations/types";
import { useAnnotations } from "./annotations/useAnnotations";
import { FileTree } from "./files/FileTree";
import { loadMarkdownTree, type TreeNode } from "./files/tree";
import { baseName, joinPath } from "./fs/path";
import { TauriFileSystem } from "./fs/tauri";
import { classifyLink, resolveImage } from "./markdown/links";
import { Markdown } from "./markdown/Markdown";
import { imageSources } from "./markdown/pipeline";
import { toSourceSelection, type SourceSelection } from "./selection/sourceSelection";
import { isThemeSetting, useTheme } from "./theme";
import "./markdown/markdown.css";

const fs = new TauriFileSystem();

/** Annotations in each file's .mdgloss sidecar, or the app's data folder when that can't be written. */
const annotationStore = new LocalAnnotationStore(
  new SidecarStore(fs, (document) => invoke("allow_sidecar", { document })),
  new AppDataStore(fs, async () => joinPath(await appDataDir(), "annotations")),
);

interface Workspace {
  /** Folder name, or the file name when a single file is open. */
  title: string;
  tree: TreeNode[];
}

/** What the floating highlight toolbar or the comment popover is acting on. */
type Target =
  | { type: "selection"; selection: SourceSelection; anchor: Anchor }
  | { type: "highlight"; id: string; anchor: Anchor };

interface OpenDocument {
  path: string;
  content: string;
  /** Files found for the document's Obsidian embeds, keyed by the rendered img src. */
  embeds: Map<string, string>;
}

/** The renderer URL-encodes srcs ("a%20b.png"); the vault search needs the file name. */
function decodeEmbed(src: string): string {
  try {
    return decodeURIComponent(src);
  } catch {
    return src;
  }
}

function App() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [doc, setDoc] = useState<OpenDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const readerRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLElement>(null);
  const [toolbar, setToolbar] = useState<Target | null>(null);
  const [commenting, setCommenting] = useState<Target | null>(null);
  const annotations = useAnnotations(annotationStore, doc?.path ?? null);
  const { update } = annotations;

  const editing = toolbar ?? commenting;
  const activeId = editing?.type === "highlight" ? editing.id : null;
  const placed = useMemo(
    () =>
      doc
        ? placeHighlights(doc.content, annotations.highlights).map((h) =>
            h.id === activeId ? { ...h, active: true } : h,
          )
        : [],
    [doc, annotations.highlights, activeId],
  );

  // Start each newly opened file at the top.
  useEffect(() => {
    readerRef.current?.scrollTo(0, 0);
  }, [doc?.path]);

  async function run(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function showFile(path: string) {
    const content = await fs.readFile(path);
    setDoc({ path, content, embeds: await allowImages(path, content) });
    setToolbar(null);
  }

  /**
   * Opening a single file only lets the asset protocol load that file, so grant the
   * images it links to before rendering, and find the files behind its Obsidian
   * embeds. A failure only costs images, not the document.
   */
  async function allowImages(docPath: string, content: string): Promise<Map<string, string>> {
    const { paths, embeds } = imageSources(content);
    const images = paths
      .map((src) => resolveImage(docPath, src))
      .filter((image) => image.type === "file")
      .map((image) => image.url);
    if (images.length === 0 && embeds.length === 0) return new Map();
    try {
      const found = await invoke<(string | null)[]>("allow_document_images", {
        document: docPath,
        images,
        embeds: embeds.map(decodeEmbed),
      });
      return new Map(
        embeds.flatMap((src, i) => (found[i] ? [[src, found[i]] as [string, string]] : [])),
      );
    } catch (e) {
      console.error(`Could not allow images for ${docPath}`, e);
      return new Map();
    }
  }

  const openFile = () =>
    run(async () => {
      const path = await open({
        multiple: false,
        directory: false,
        filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
      });
      if (path === null) return;
      setWorkspace({
        title: baseName(path),
        tree: [{ kind: "file", name: baseName(path), path }],
      });
      await showFile(path);
    });

  const openFolder = () =>
    run(async () => {
      // recursive: true grants access to subfolders, not just the picked folder itself.
      const path = await open({ multiple: false, directory: true, recursive: true });
      if (path === null) return;
      setWorkspace({
        title: baseName(path),
        tree: await loadMarkdownTree(fs, path),
      });
      setDoc(null);
    });

  function imageSrc(doc: OpenDocument, src: string): string {
    const embed = doc.embeds.get(src);
    if (embed) return convertFileSrc(embed);
    const image = resolveImage(doc.path, src);
    return image.type === "file" ? convertFileSrc(image.url) : image.url;
  }

  function followLink(docPath: string, href: string) {
    const target = classifyLink(docPath, href);
    switch (target.type) {
      case "anchor":
        document.getElementById(target.id)?.scrollIntoView();
        break;
      case "external":
        run(() => openUrl(target.url));
        break;
      case "markdown":
        run(() => showFile(target.path));
        break;
      case "other":
        run(() => revealItemInDir(target.path));
        break;
    }
  }

  /** Offers the toolbar for a new selection. A plain click is left to onReaderClick. */
  function onReaderMouseUp() {
    const article = articleRef.current;
    const selection = window.getSelection();
    if (!doc || !article || !annotations.editable || !selection || selection.rangeCount === 0)
      return;
    const range = selection.getRangeAt(0);
    if (range.collapsed) return;
    const mapped = toSourceSelection(range, article, doc.content);
    setToolbar(
      mapped ? { type: "selection", selection: mapped, anchor: range.cloneRange() } : null,
    );
  }

  /** Opens the toolbar for a clicked highlight, or closes it on a click elsewhere. */
  function onReaderClick(event: React.MouseEvent) {
    if (!window.getSelection()?.isCollapsed) return;
    const mark = (event.target as Element).closest("mark[data-highlight]");
    const id = mark?.getAttribute("data-highlight");
    setToolbar(mark && id && annotations.editable ? { type: "highlight", id, anchor: mark } : null);
  }

  const closeToolbar = useCallback(() => setToolbar(null), []);

  const pickColor = useCallback(
    (color: HighlightColor) => {
      if (toolbar?.type === "selection") {
        update((highlights) => [...highlights, createHighlight(toolbar.selection, color)]);
        window.getSelection()?.removeAllRanges();
      } else if (toolbar?.type === "highlight") {
        const updated = new Date().toISOString();
        update((highlights) =>
          highlights.map((h) => (h.id === toolbar.id ? { ...h, color, updated } : h)),
        );
      }
      setToolbar(null);
    },
    [toolbar, update],
  );

  const openComment = useCallback(() => {
    setCommenting(toolbar);
    setToolbar(null);
  }, [toolbar]);

  /** A new selection becomes a yellow highlight only once it has a comment. */
  function saveComment(comment: string | null) {
    const target = commenting;
    setCommenting(null);
    if (target?.type === "selection") {
      if (comment === null) return;
      update((highlights) => [
        ...highlights,
        { ...createHighlight(target.selection, "yellow"), comment },
      ]);
      window.getSelection()?.removeAllRanges();
    } else if (target?.type === "highlight") {
      const existing = annotations.highlights.find((h) => h.id === target.id);
      if (!existing || existing.comment === comment) return;
      const updated = new Date().toISOString();
      update((highlights) =>
        highlights.map((h) => (h.id === target.id ? { ...h, comment, updated } : h)),
      );
    }
  }

  const deleteHighlight = useCallback(() => {
    if (toolbar?.type !== "highlight") return;
    update((highlights) => highlights.filter((h) => h.id !== toolbar.id));
    setToolbar(null);
  }, [toolbar, update]);

  const edited =
    editing?.type === "highlight"
      ? annotations.highlights.find((h) => h.id === editing.id)
      : undefined;
  const headerError = error ?? annotations.error;

  const ThemeIcon = { system: Monitor, light: Sun, dark: Moon }[theme.setting];

  return (
    <SidebarProvider
      className="h-dvh min-h-0 overflow-hidden"
      style={{ "--sidebar-width": "260px" } as React.CSSProperties}
    >
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Open file" onClick={openFile}>
                <FileText />
                <span>Open file</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Open folder" onClick={openFolder}>
                <FolderOpen />
                <span>Open folder</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          {workspace && (
            <SidebarGroup className="group-data-[collapsible=icon]:hidden">
              <SidebarGroupLabel>{workspace.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                {workspace.tree.length > 0 ? (
                  <FileTree
                    nodes={workspace.tree}
                    selectedPath={doc?.path ?? null}
                    onSelect={(path) => run(() => showFile(path))}
                  />
                ) : (
                  <p className="px-2 text-xs text-muted-foreground">
                    No markdown files in this folder.
                  </p>
                )}
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0">
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
          <span className="min-w-0 truncate text-sm text-muted-foreground" title={doc?.path}>
            {doc ? doc.path : "mdgloss"}
          </span>
          {doc && annotations.location === "app" && (
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
          {headerError && (
            <span
              className="min-w-0 truncate text-sm text-destructive"
              role="alert"
              title={headerError}
            >
              {headerError}
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="ml-auto" aria-label="Theme">
                <ThemeIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Theme</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={theme.setting}
                onValueChange={(value) => isThemeSetting(value) && theme.setSetting(value)}
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
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <div
          className="min-h-0 flex-1 overflow-y-auto"
          ref={readerRef}
          // The toolbar is fixed in the window, so it would drift away from its text.
          onScroll={toolbar ? closeToolbar : undefined}
        >
          {doc ? (
            <article
              className="markdown-body px-8 py-12"
              ref={articleRef}
              onMouseUp={onReaderMouseUp}
              onClick={onReaderClick}
            >
              <Markdown
                source={doc.content}
                highlights={placed}
                resolveImageSrc={(src) => imageSrc(doc, src)}
                onLinkClick={(href) => followLink(doc.path, href)}
              />
            </article>
          ) : (
            <Empty className="h-full">
              <EmptyHeader>
                <EmptyTitle>{workspace ? "No file open." : "Nothing open."}</EmptyTitle>
                <EmptyDescription>
                  {workspace
                    ? "Pick a file from the sidebar to start reading."
                    : "Open a markdown file or folder to start reading."}
                </EmptyDescription>
              </EmptyHeader>
              {!workspace && (
                <EmptyContent>
                  <div className="flex gap-2">
                    <Button onClick={openFolder}>
                      <FolderOpen data-icon="inline-start" />
                      Open folder
                    </Button>
                    <Button variant="outline" onClick={openFile}>
                      <FileText data-icon="inline-start" />
                      Open file
                    </Button>
                  </div>
                </EmptyContent>
              )}
            </Empty>
          )}
        </div>
        {doc && toolbar && (
          <HighlightToolbar
            anchor={toolbar.anchor.getBoundingClientRect()}
            color={edited?.color}
            onPick={pickColor}
            commented={Boolean(edited?.comment)}
            onComment={openComment}
            onDelete={toolbar.type === "highlight" ? deleteHighlight : undefined}
            onDismiss={closeToolbar}
          />
        )}
        {doc && commenting && (
          <CommentPopover
            anchor={commenting.anchor}
            comment={edited?.comment ?? null}
            onSave={saveComment}
            onCancel={() => setCommenting(null)}
          />
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}

export default App;
