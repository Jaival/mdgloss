import { describe, expect, it } from "vitest";
import type { FileSystem } from "../fs/types";
import { emptyAnnotations } from "./format";
import { createHighlight } from "./highlights";
import { AppDataStore, LocalAnnotationStore, SidecarStore } from "./store";

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
    rename: async (from, to) => {
      const content = files.get(from);
      if (content === undefined) throw new Error(`No such file: ${from}`);
      files.set(to, content);
      files.delete(from);
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
    await store.save("/notes/week1.md", file, emptyAnnotations("week1.md"));

    expect(dirs).toContain("/notes/.mdgloss");
    expect([...files.keys()]).toEqual(["/notes/.mdgloss/week1.md.json"]);
    expect(await store.load("/notes/week1.md")).toEqual(file);
  });

  it("keeps Windows separators", async () => {
    const { fs, files, dirs } = memoryFileSystem();
    await new SidecarStore(fs).save(
      "C:\\notes\\week1.md",
      emptyAnnotations("week1.md"),
      emptyAnnotations("week1.md"),
    );
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
    await store.save("/notes/a.md", emptyAnnotations("a.md"), emptyAnnotations("a.md"));
    expect(allowed).toEqual(["/notes/a.md", "/notes/a.md"]);
  });

  it("fails to load a broken sidecar rather than starting over", async () => {
    const { fs, files } = memoryFileSystem();
    files.set("/notes/.mdgloss/a.md.json", "{ broken");
    await expect(new SidecarStore(fs).load("/notes/a.md")).rejects.toThrow(/not valid JSON/);
  });

  it("merges a change made on disk since the file was read", async () => {
    const { fs } = memoryFileSystem();
    const store = new SidecarStore(fs);
    const base = await store.load("/notes/a.md");
    const theirs = createHighlight(selection, "green");
    await new SidecarStore(fs).save("/notes/a.md", { ...base, highlights: [theirs] }, base);

    const ours = createHighlight(selection, "yellow");
    const saved = await store.save("/notes/a.md", { ...base, highlights: [ours] }, base);

    const ids = [ours.id, theirs.id];
    expect(saved.file.highlights.map((h) => h.id)).toEqual(ids);
    expect((await store.load("/notes/a.md")).highlights.map((h) => h.id)).toEqual(ids);
  });

  it("keeps the highlights when the sidecar was removed elsewhere", async () => {
    const { fs, files } = memoryFileSystem();
    const store = new SidecarStore(fs);
    const file = { ...emptyAnnotations("a.md"), highlights: [createHighlight(selection, "pink")] };
    await store.save("/notes/a.md", file, emptyAnnotations("a.md"));
    files.delete("/notes/.mdgloss/a.md.json");

    const edited = {
      ...file,
      highlights: [...file.highlights, createHighlight(selection, "green")],
    };
    expect((await store.save("/notes/a.md", edited, file)).file).toEqual(edited);
  });

  it("writes a temporary file and renames it over the sidecar", async () => {
    const { fs, files } = memoryFileSystem();
    const written: string[] = [];
    const store = new SidecarStore({
      ...fs,
      writeFile: (path, content) => {
        written.push(path);
        return fs.writeFile(path, content);
      },
    });
    await store.save("/notes/a.md", emptyAnnotations("a.md"), emptyAnnotations("a.md"));

    expect(written).toEqual(["/notes/.mdgloss/a.md.json.tmp"]);
    expect([...files.keys()]).toEqual(["/notes/.mdgloss/a.md.json"]);
  });

  it("leaves the sidecar as it was when the rename fails", async () => {
    const { fs, files } = memoryFileSystem();
    const file = { ...emptyAnnotations("a.md"), highlights: [createHighlight(selection, "pink")] };
    await new SidecarStore(fs).save("/notes/a.md", file, emptyAnnotations("a.md"));
    const before = files.get("/notes/.mdgloss/a.md.json");

    const failing = new SidecarStore({ ...fs, rename: () => Promise.reject(new Error("crash")) });
    await expect(failing.save("/notes/a.md", emptyAnnotations("a.md"), file)).rejects.toThrow();
    expect(files.get("/notes/.mdgloss/a.md.json")).toBe(before);
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

describe("LocalAnnotationStore", () => {
  const dir = async () => "/appdata/annotations";
  const none = emptyAnnotations("a.md");

  function stores(fs: FileSystem) {
    const sidecar = new SidecarStore(fs);
    const app = new AppDataStore(fs, dir);
    return { sidecar, app, local: new LocalAnnotationStore(sidecar, app) };
  }

  it("saves to the sidecar, whether a file or its folder was opened", async () => {
    const { fs, files } = memoryFileSystem();
    const { local } = stores(fs);
    const file = {
      ...emptyAnnotations("a.md"),
      highlights: [createHighlight(selection, "yellow")],
    };

    expect((await local.save("/notes/a.md", file, none)).location).toBe("sidecar");
    expect([...files.keys()]).toEqual(["/notes/.mdgloss/a.md.json"]);
  });

  it("merges highlights from app storage and moves them on the next save", async () => {
    const { fs } = memoryFileSystem();
    const { sidecar, app, local } = stores(fs);
    const inSidecar = createHighlight(selection, "yellow");
    const inApp = createHighlight(selection, "pink");
    await sidecar.save("/notes/a.md", { ...none, highlights: [inSidecar] }, none);
    await app.save("/notes/a.md", { ...none, highlights: [inApp] });

    const loaded = await local.load("/notes/a.md");
    expect(loaded.highlights.map((h) => h.id)).toEqual([inSidecar.id, inApp.id]);

    // Deleting the moved highlight must stick: app storage no longer has it.
    await local.save("/notes/a.md", { ...loaded, highlights: [inSidecar] }, loaded);
    expect((await app.load("/notes/a.md")).highlights).toEqual([]);
    expect((await local.load("/notes/a.md")).highlights.map((h) => h.id)).toEqual([inSidecar.id]);
  });

  it("moves app-storage highlights into a sidecar that doesn't have them", async () => {
    const { fs } = memoryFileSystem();
    const { sidecar, app, local } = stores(fs);
    const inSidecar = createHighlight(selection, "yellow");
    const inApp = createHighlight(selection, "pink");
    await sidecar.save("/notes/a.md", { ...none, highlights: [inSidecar] }, none);
    await app.save("/notes/a.md", { ...none, highlights: [inApp] });

    const loaded = await local.load("/notes/a.md");
    const added = createHighlight(selection, "green");
    await local.save(
      "/notes/a.md",
      { ...loaded, highlights: [...loaded.highlights, added] },
      loaded,
    );

    const ids = [inSidecar.id, inApp.id, added.id];
    expect((await sidecar.load("/notes/a.md")).highlights.map((h) => h.id)).toEqual(ids);
  });

  it("doesn't duplicate a highlight that is in both places", async () => {
    const { fs } = memoryFileSystem();
    const { sidecar, app, local } = stores(fs);
    const both = { ...emptyAnnotations("a.md"), highlights: [createHighlight(selection, "green")] };
    await sidecar.save("/notes/a.md", both, none);
    await app.save("/notes/a.md", both);
    expect((await local.load("/notes/a.md")).highlights).toHaveLength(1);
  });

  it("falls back to app storage when the sidecar can't be written", async () => {
    const { fs, files } = memoryFileSystem();
    const readOnly: FileSystem = {
      ...fs,
      createDir: async (path) => {
        if (path.includes(".mdgloss")) throw new Error("Access is denied");
        return fs.createDir(path);
      },
    };
    const { local } = stores(readOnly);
    const file = {
      ...emptyAnnotations("a.md"),
      highlights: [createHighlight(selection, "yellow")],
    };

    expect((await local.save("/locked/a.md", file, none)).location).toBe("app");
    expect([...files.keys()][0]).toMatch(/^\/appdata\/annotations\//);
    expect((await local.load("/locked/a.md")).highlights).toEqual(file.highlights);
  });

  it("refuses to load when the sidecar is broken", async () => {
    const { fs, files } = memoryFileSystem();
    files.set("/notes/.mdgloss/a.md.json", "{ broken");
    await expect(stores(fs).local.load("/notes/a.md")).rejects.toThrow(/not valid JSON/);
  });

  it("still loads the sidecar when the app-storage copy is broken", async () => {
    const { fs, files } = memoryFileSystem();
    const { sidecar, app, local } = stores(fs);
    const file = {
      ...emptyAnnotations("a.md"),
      highlights: [createHighlight(selection, "yellow")],
    };
    await sidecar.save("/notes/a.md", file, none);
    await app.save("/notes/a.md", file);
    const appFile = [...files.keys()].find((path) => path.startsWith("/appdata"))!;
    files.set(appFile, "{ broken");

    const error = console.error;
    console.error = () => {};
    try {
      expect((await local.load("/notes/a.md")).highlights).toEqual(file.highlights);
    } finally {
      console.error = error;
    }
  });
});
