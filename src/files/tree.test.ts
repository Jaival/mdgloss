import { describe, expect, it } from "vitest";
import type { Entry, FileSystem } from "../fs/types";
import { loadMarkdownTree, type TreeNode } from "./tree";

/** In-memory FileSystem built from a list of file paths. Only listDir is needed here. */
function fakeFileSystem(files: string[]): FileSystem {
  return {
    async listDir(dir) {
      const prefix = `${dir}/`;
      const seen = new Map<string, Entry>();
      for (const file of files.filter((f) => f.startsWith(prefix))) {
        const [name, ...rest] = file.slice(prefix.length).split("/");
        seen.set(name, {
          path: `${prefix}${name}`,
          name,
          kind: rest.length > 0 ? "directory" : "file",
        });
      }
      return [...seen.values()];
    },
    readFile: () => Promise.reject(new Error("not used")),
    writeFile: () => Promise.reject(new Error("not used")),
    watch: () => () => {},
    canWrite: () => Promise.resolve(false),
  };
}

/** Compact view of a tree for assertions: folders end with "/". */
function names(nodes: TreeNode[]): unknown[] {
  return nodes.map((node) =>
    node.kind === "directory" ? { [`${node.name}/`]: names(node.children) } : node.name,
  );
}

describe("loadMarkdownTree", () => {
  it("keeps only markdown files", async () => {
    const fs = fakeFileSystem(["/n/a.md", "/n/b.txt", "/n/c.markdown", "/n/img.png"]);
    expect(names(await loadMarkdownTree(fs, "/n"))).toEqual(["a.md", "c.markdown"]);
  });

  it("recurses into folders and drops ones without markdown", async () => {
    const fs = fakeFileSystem(["/n/os/week1.md", "/n/os/img/diagram.png", "/n/empty/notes.txt"]);
    expect(names(await loadMarkdownTree(fs, "/n"))).toEqual([{ "os/": ["week1.md"] }]);
  });

  it("skips hidden and node_modules folders", async () => {
    const fs = fakeFileSystem([
      "/n/.git/HEAD.md",
      "/n/.mdgloss/x.md",
      "/n/node_modules/pkg/README.md",
      "/n/README.md",
    ]);
    expect(names(await loadMarkdownTree(fs, "/n"))).toEqual(["README.md"]);
  });

  it("sorts folders first, then names in natural order", async () => {
    const fs = fakeFileSystem(["/n/week10.md", "/n/week2.md", "/n/Appendix.md", "/n/z/a.md"]);
    expect(names(await loadMarkdownTree(fs, "/n"))).toEqual([
      { "z/": ["a.md"] },
      "Appendix.md",
      "week2.md",
      "week10.md",
    ]);
  });

  it("keeps full paths on nodes", async () => {
    const fs = fakeFileSystem(["/n/os/week1.md"]);
    const [folder] = await loadMarkdownTree(fs, "/n");
    expect(folder).toMatchObject({ path: "/n/os", children: [{ path: "/n/os/week1.md" }] });
  });
});
