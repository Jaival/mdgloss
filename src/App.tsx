import { useEffect, useRef, useState } from "react";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { openUrl, revealItemInDir } from "@tauri-apps/plugin-opener";
import { FileTree } from "./files/FileTree";
import { loadMarkdownTree, type TreeNode } from "./files/tree";
import { baseName } from "./fs/path";
import { TauriFileSystem } from "./fs/tauri";
import { classifyLink, resolveImage } from "./markdown/links";
import { Markdown } from "./markdown/Markdown";
import { imageSources } from "./markdown/pipeline";
import { useTheme } from "./theme";
import "./App.css";
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
  const readerRef = useRef<HTMLElement>(null);

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

  return (
    <div className="app">
      <header className="toolbar">
        <span className="brand">mdgloss</span>
        <button type="button" onClick={openFile}>
          Open file
        </button>
        <button type="button" onClick={openFolder}>
          Open folder
        </button>
        <button type="button" className="theme-toggle" onClick={theme.cycle}>
          Theme: {theme.setting}
        </button>
        {error && (
          <span className="error" role="alert">
            {error}
          </span>
        )}
      </header>

      <aside className="sidebar">
        {workspace ? (
          <>
            <h2 className="sidebar-title">{workspace.title}</h2>
            {workspace.tree.length > 0 ? (
              <FileTree
                nodes={workspace.tree}
                selectedPath={doc?.path ?? null}
                onSelect={(path) => run(() => showFile(path))}
              />
            ) : (
              <p className="muted">No markdown files in this folder.</p>
            )}
          </>
        ) : (
          <p className="muted">Open a markdown file or folder to start reading.</p>
        )}
      </aside>

      <main className="reader" ref={readerRef}>
        {doc ? (
          <article className="markdown-body">
            <Markdown
              source={doc.content}
              resolveImageSrc={(src) => imageSrc(doc, src)}
              onLinkClick={(href) => followLink(doc.path, href)}
            />
          </article>
        ) : (
          <p className="muted">{workspace ? "Pick a file from the list." : null}</p>
        )}
      </main>
    </div>
  );
}

export default App;
