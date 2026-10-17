import { baseName, joinPath } from "../fs/path";
import type { FileSystem } from "../fs/types";
import { emptyAnnotations, parseAnnotations, serializeAnnotations } from "./format";
import { sidecarPath } from "./sidecar";
import type { AnnotationFile } from "./types";

/** "sidecar": the .mdgloss folder next to the file. "app": the app's own storage. */
export type StorageLocation = "sidecar" | "app";

/** Where a markdown file's annotations are read from and written to. */
export interface AnnotationStore {
  /** Throws if the stored file exists but can't be read safely; see parseAnnotations. */
  load(markdownPath: string): Promise<AnnotationFile>;
  /** Resolves to where the annotations were written. */
  save(markdownPath: string, annotations: AnnotationFile): Promise<StorageLocation>;
}

/**
 * Keeps annotations in `.mdgloss/<name>.json` next to each markdown file, so
 * they travel with the folder. `allow` runs before each access, to grant the
 * hidden folder (see allow_sidecar in src-tauri).
 */
export class SidecarStore implements AnnotationStore {
  constructor(
    private fs: FileSystem,
    private allow: (markdownPath: string) => Promise<void> = async () => {},
  ) {}

  async load(markdownPath: string): Promise<AnnotationFile> {
    await this.allow(markdownPath);
    const path = this.pathFor(markdownPath);
    if (!(await this.fs.exists(path))) return emptyAnnotations(baseName(markdownPath));
    return parseAnnotations(await this.fs.readFile(path));
  }

  async save(markdownPath: string, annotations: AnnotationFile): Promise<StorageLocation> {
    await this.allow(markdownPath);
    const path = this.pathFor(markdownPath);
    await this.fs.createDir(path.slice(0, Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"))));
    await this.fs.writeFile(path, serializeAnnotations(annotations));
    return "sidecar";
  }

  /** sidecarPath uses "/", which Windows accepts too; keep the folder's own style. */
  private pathFor(markdownPath: string): string {
    const path = sidecarPath(markdownPath);
    return markdownPath.includes("\\") ? path.replace(/\//g, "\\") : path;
  }
}

/**
 * Keeps annotations in the app's data folder, for files whose folder can't be
 * written. Each file is named after a hash of the markdown file's absolute
 * path, and records that path so it can be read by a person.
 */
export class AppDataStore implements AnnotationStore {
  constructor(
    private fs: FileSystem,
    /** The folder to keep annotation files in, such as $APPDATA/annotations. */
    private dir: () => Promise<string>,
  ) {}

  async load(markdownPath: string): Promise<AnnotationFile> {
    const path = await this.pathFor(markdownPath);
    if (!(await this.fs.exists(path))) return emptyAnnotations(baseName(markdownPath));
    return parseAnnotations(await this.fs.readFile(path));
  }

  async save(markdownPath: string, annotations: AnnotationFile): Promise<StorageLocation> {
    const dir = await this.dir();
    await this.fs.createDir(dir);
    const path = joinPath(dir, await fileNameFor(markdownPath));
    await this.fs.writeFile(path, serializeAnnotations({ ...annotations, path: markdownPath }));
    return "app";
  }

  private async pathFor(markdownPath: string): Promise<string> {
    return joinPath(await this.dir(), await fileNameFor(markdownPath));
  }
}

/**
 * A file's annotations live in its sidecar, whether the file was opened on its
 * own or inside a folder, so both ways show the same highlights. App storage
 * is the fallback for when the sidecar can't be written (a read-only folder).
 *
 * Highlights found in app storage are shown along with the sidecar's, and
 * moved into the sidecar on the next save. App storage is then emptied, so a
 * highlight deleted later doesn't come back from there.
 */
export class LocalAnnotationStore implements AnnotationStore {
  /** Files whose app-storage highlights were merged in and still need moving. */
  private pending = new Set<string>();

  constructor(
    private sidecar: AnnotationStore,
    private app: AnnotationStore,
  ) {}

  async load(markdownPath: string): Promise<AnnotationFile> {
    const file = await this.sidecar.load(markdownPath);
    const stored = await this.app.load(markdownPath).catch((e: unknown) => {
      // The sidecar is the main copy; a broken fallback file shouldn't hide it.
      console.error(`Could not read app-storage annotations for ${markdownPath}`, e);
      return null;
    });
    if (!stored || stored.highlights.length === 0) {
      this.pending.delete(markdownPath);
      return file;
    }

    this.pending.add(markdownPath);
    const ids = new Set(file.highlights.map((h) => h.id));
    return {
      ...file,
      highlights: [...file.highlights, ...stored.highlights.filter((h) => !ids.has(h.id))],
    };
  }

  async save(markdownPath: string, annotations: AnnotationFile): Promise<StorageLocation> {
    try {
      await this.sidecar.save(markdownPath, annotations);
    } catch (e) {
      console.warn(`Could not write the sidecar for ${markdownPath}; using app storage`, e);
      this.pending.delete(markdownPath);
      return this.app.save(markdownPath, annotations);
    }
    if (this.pending.has(markdownPath)) {
      await this.app.save(markdownPath, {
        ...emptyAnnotations(baseName(markdownPath)),
        movedTo: "sidecar",
      });
      this.pending.delete(markdownPath);
    }
    return "sidecar";
  }
}

async function fileNameFor(markdownPath: string): Promise<string> {
  const bytes = new TextEncoder().encode(markdownPath);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const hex = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex}.json`;
}
