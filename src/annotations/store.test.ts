import { describe, expect, it } from "vitest";
import type { FileSystem } from "../fs/types";
import { emptyAnnotations } from "./format";
import { createHighlight } from "./highlights";
import { AppDataStore, SidecarStore } from "./store";

/** In-memory FileSystem that records folders and files. */
function memoryFileSystem() {
  const files = new Map<string, string>();
  const dirs = new Set<string>();
  const fs: FileSystem = {
    readFile: async (path) => {
      const content = files.get(path);
      if (content === undefined) throw new Error(`No such file: ${path}`);
      return content;
    },
    writeFile: async (path, content) => {
      files.set(path, content);
    },
    exists: async (path) => files.has(path) || dirs.has(path),
    createDir: async (path) => {
      dirs.add(path);
    },
    listDir: async () => [],
    watch: () => () => {},
    canWrite: async () => true,
  };
  return { fs, files, dirs };
}

const selection = { start: 2, end: 9, quote: "process", prefix: "A ", suffix: " is" };

describe("SidecarStore", () => {
  it("loads an empty file when there is no sidecar yet", async () => {
    const { fs } = memoryFileSystem();
    const store = new SidecarStore(fs);
    expect(await store.load("/notes/week1.md")).toEqual(emptyAnnotations("week1.md"));
  });

  it("writes .mdgloss next to the file and reads it back", async () => {
    const { fs, files, dirs } = memoryFileSystem();
    const store = new SidecarStore(fs);
    const file = {
      ...emptyAnnotations("week1.md"),
      highlights: [createHighlight(selection, "yellow")],
    };
    await store.save("/notes/week1.md", file);

    expect(dirs).toContain("/notes/.mdgloss");
    expect([...files.keys()]).toEqual(["/notes/.mdgloss/week1.md.json"]);
    expect(await store.load("/notes/week1.md")).toEqual(file);
  });

  it("keeps Windows separators", async () => {
    const { fs, files, dirs } = memoryFileSystem();
    await new SidecarStore(fs).save("C:\\notes\\week1.md", emptyAnnotations("week1.md"));
    expect(dirs).toContain("C:\\notes\\.mdgloss");
    expect([...files.keys()]).toEqual(["C:\\notes\\.mdgloss\\week1.md.json"]);
  });

  it("asks for access before reading and writing", async () => {
    const { fs } = memoryFileSystem();
    const allowed: string[] = [];
    const store = new SidecarStore(fs, async (path) => {
      allowed.push(path);
    });
    await store.load("/notes/a.md");
    await store.save("/notes/a.md", emptyAnnotations("a.md"));
    expect(allowed).toEqual(["/notes/a.md", "/notes/a.md"]);
  });

  it("fails to load a broken sidecar rather than starting over", async () => {
    const { fs, files } = memoryFileSystem();
    files.set("/notes/.mdgloss/a.md.json", "{ broken");
    await expect(new SidecarStore(fs).load("/notes/a.md")).rejects.toThrow(/not valid JSON/);
  });
});

describe("AppDataStore", () => {
  const dir = async () => "/appdata/annotations";

  it("keeps one file per markdown path, named by a hash", async () => {
    const { fs, files, dirs } = memoryFileSystem();
    const store = new AppDataStore(fs, dir);
    await store.save("/a/week1.md", emptyAnnotations("week1.md"));
    await store.save("/b/week1.md", emptyAnnotations("week1.md"));

    expect(dirs).toContain("/appdata/annotations");
    const names = [...files.keys()];
    expect(names).toHaveLength(2);
    for (const name of names) expect(name).toMatch(/^\/appdata\/annotations\/[0-9a-f]{64}\.json$/);
  });

  it("records the markdown path and reads the file back", async () => {
    const { fs, files } = memoryFileSystem();
    const store = new AppDataStore(fs, dir);
    const file = {
      ...emptyAnnotations("week1.md"),
      highlights: [createHighlight(selection, "pink")],
    };
    await store.save("/a/week1.md", file);

    expect(JSON.parse([...files.values()][0]).path).toBe("/a/week1.md");
    expect(await store.load("/a/week1.md")).toMatchObject(file);
    expect(await store.load("/b/week1.md")).toEqual(emptyAnnotations("week1.md"));
  });
});
