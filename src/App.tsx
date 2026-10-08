import { useEffect, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { openUrl, revealItemInDir } from "@tauri-apps/plugin-opener";
import { FileTree } from "./files/FileTree";
import { loadMarkdownTree, type TreeNode } from "./files/tree";
import { baseName } from "./fs/path";
import { TauriFileSystem } from "./fs/tauri";
import { classifyLink, resolveImage } from "./markdown/links";
import { Markdown } from "./markdown/Markdown";
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
    setDoc({ path, content: await fs.readFile(path) });
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

  function imageSrc(docPath: string, src: string): string {
    const image = resolveImage(docPath, src);
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
              resolveImageSrc={(src) => imageSrc(doc.path, src)}
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
