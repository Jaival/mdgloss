import { describe, expect, it } from "vitest";
import type { FileSystem } from "../fs/types";
import { reloadFile } from "./reload";

/** A FileSystem with one file whose read and existence the test controls. */
function fakeFileSystem(file: { content?: string; exists: boolean }): FileSystem {
  const unused = () => Promise.reject(new Error("not used"));
  return {
    readFile: () =>
      file.content === undefined
        ? Promise.reject(new Error("cannot read"))
        : Promise.resolve(file.content),
    exists: () => Promise.resolve(file.exists),
    writeFile: unused,
    rename: unused,
    listDir: unused,
    createDir: unused,
    watch: () => () => {},
    canWrite: () => Promise.resolve(false),
  };
}

describe("reloadFile", () => {
  it("returns the new content", async () => {
    const fs = fakeFileSystem({ content: "# New", exists: true });
    expect(await reloadFile(fs, "/a.md")).toEqual({ type: "read", content: "# New" });
  });

  it("reports a deleted or moved file as missing", async () => {
    const fs = fakeFileSystem({ exists: false });
    expect(await reloadFile(fs, "/a.md")).toEqual({ type: "missing" });
  });

  it("reports a file that exists but can't be read as unreadable", async () => {
    const fs = fakeFileSystem({ exists: true });
    expect(await reloadFile(fs, "/a.md")).toEqual({ type: "unreadable" });
  });
});
