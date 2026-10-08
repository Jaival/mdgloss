import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { FileTree } from "./files/FileTree";
import { loadMarkdownTree, type TreeNode } from "./files/tree";
import { baseName } from "./fs/path";
import { TauriFileSystem } from "./fs/tauri";
import "./App.css";

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
      const path = await open({ multiple: false, directory: true });
      if (path === null) return;
      setWorkspace({ title: baseName(path), tree: await loadMarkdownTree(fs, path) });
      setDoc(null);
    });

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

      <main className="reader">
        {doc ? (
          // Plain source until the markdown renderer lands (week 2).
          <pre className="source">{doc.content}</pre>
        ) : (
          <p className="muted">{workspace ? "Pick a file from the list." : null}</p>
        )}
      </main>
    </div>
  );
}

export default App;
