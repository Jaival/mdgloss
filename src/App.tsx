import { useEffect, useRef, useState } from "react";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { openUrl, revealItemInDir } from "@tauri-apps/plugin-opener";
import { FileText, FolderOpen, Monitor, Moon, Sun } from "lucide-react";
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
import { FileTree } from "./files/FileTree";
import { loadMarkdownTree, type TreeNode } from "./files/tree";
import { baseName } from "./fs/path";
import { TauriFileSystem } from "./fs/tauri";
import { classifyLink, resolveImage } from "./markdown/links";
import { Markdown } from "./markdown/Markdown";
import { imageSources } from "./markdown/pipeline";
import { isThemeSetting, useTheme } from "./theme";
import "./markdown/markdown.css";

const fs = new TauriFileSystem();

interface Workspace {
  /** Folder name, or the file name when a single file is open. */
  title: string;
  tree: TreeNode[];
}

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
      setWorkspace({ title: baseName(path), tree: [{ kind: "file", name: baseName(path), path }] });
      await showFile(path);
    });

  const openFolder = () =>
    run(async () => {
      // recursive: true grants access to subfolders, not just the picked folder itself.
      const path = await open({ multiple: false, directory: true, recursive: true });
      if (path === null) return;
      setWorkspace({ title: baseName(path), tree: await loadMarkdownTree(fs, path) });
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
          {error && (
            <span className="min-w-0 truncate text-sm text-destructive" role="alert" title={error}>
              {error}
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

        <div className="min-h-0 flex-1 overflow-y-auto" ref={readerRef}>
          {doc ? (
            <article className="markdown-body px-8 py-12">
              <Markdown
                source={doc.content}
                resolveImageSrc={(src) => imageSrc(doc, src)}
                onLinkClick={(href) => followLink(doc.path, href)}
              />
            </article>
          ) : (
            <Empty className="h-full">
              <EmptyHeader>
                <EmptyTitle>{workspace ? "No file open." : "No folder open."}</EmptyTitle>
                <EmptyDescription>
                  {workspace
                    ? "Pick a file from the sidebar to start reading."
                    : "Open a markdown file or folder to start reading."}
                </EmptyDescription>
              </EmptyHeader>
              {!workspace && (
                <EmptyContent>
                  <Button onClick={openFolder}>
                    <FolderOpen data-icon="inline-start" />
                    Open folder
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default App;
