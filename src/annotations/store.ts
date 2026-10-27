import { baseName, joinPath } from "../fs/path";
import type { FileSystem } from "../fs/types";
import { emptyAnnotations, parseAnnotations, serializeAnnotations } from "./format";
import { mergeAnnotations } from "./merge";
import { sidecarPath } from "./sidecar";
import type { AnnotationFile } from "./types";

/** "sidecar": the .mdgloss folder next to the file. "app": the app's own storage. */
export type StorageLocation = "sidecar" | "app";

/** The result of a save: where it went, and what was written. */
export interface Saved {
  location: StorageLocation;
  /** `annotations` merged with changes made elsewhere since `base`. */
  file: AnnotationFile;
}

/** Where a markdown file's annotations are read from and written to. */
export interface AnnotationStore {
  /** Throws if the stored file exists but can't be read safely; see parseAnnotations. */
  load(markdownPath: string): Promise<AnnotationFile>;
  /** `base` is the file `annotations` was changed from, to merge changes made elsewhere. */
  save(markdownPath: string, annotations: AnnotationFile, base: AnnotationFile): Promise<Saved>;
}

/**
 * Keeps annotations in `.mdgloss/<name>.json` next to each markdown file, so
 * they travel with the folder. `allow` runs before each access, to grant the
 * hidden folder (see allow_sidecar in src-tauri).
 *
 * The sidecar can change while the file is open (sync, `git pull`, another
 * window), so each save re-reads it and merges (see mergeAnnotations). Saves
 * write a temporary file and rename it over the sidecar, so a crash or a sync
 * client never sees half a file.
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

  async save(
    markdownPath: string,
    annotations: AnnotationFile,
    base: AnnotationFile,
  ): Promise<Saved> {
    await this.allow(markdownPath);
    const path = this.pathFor(markdownPath);
    // A sidecar removed elsewhere isn't taken as deleting every highlight.
    const file = (await this.fs.exists(path))
      ? mergeAnnotations(base, annotations, parseAnnotations(await this.fs.readFile(path)))
      : annotations;
    await this.fs.createDir(path.slice(0, Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"))));
    const temp = `${path}.tmp`;
    await this.fs.writeFile(temp, serializeAnnotations(file));
    await this.fs.rename(temp, path);
    return { location: "sidecar", file };
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

  /** App storage belongs to this device, so there is nothing to merge. */
  async save(markdownPath: string, annotations: AnnotationFile): Promise<Saved> {
    const dir = await this.dir();
    await this.fs.createDir(dir);
    const path = joinPath(dir, await fileNameFor(markdownPath));
    await this.fs.writeFile(path, serializeAnnotations({ ...annotations, path: markdownPath }));
    return { location: "app", file: annotations };
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
  /** Per file, the ids of app-storage highlights that were merged in and still need moving. */
  private pending = new Map<string, Set<string>>();

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

    const ids = new Set(file.highlights.map((h) => h.id));
    const moving = stored.highlights.filter((h) => !ids.has(h.id));
    this.pending.set(markdownPath, new Set(moving.map((h) => h.id)));
    return { ...file, highlights: [...file.highlights, ...moving] };
  }

  async save(
    markdownPath: string,
    annotations: AnnotationFile,
    base: AnnotationFile,
  ): Promise<Saved> {
    // Highlights moving from app storage aren't in the sidecar yet; to the
    // merge they are new here, not deleted on disk.
    const moving = this.pending.get(markdownPath);
    const sidecarBase = moving
      ? { ...base, highlights: base.highlights.filter((h) => !moving.has(h.id)) }
      : base;
    let saved: Saved;
    try {
      saved = await this.sidecar.save(markdownPath, annotations, sidecarBase);
    } catch (e) {
      console.warn(`Could not write the sidecar for ${markdownPath}; using app storage`, e);
      this.pending.delete(markdownPath);
      return this.app.save(markdownPath, annotations, base);
    }
    if (moving) {
      const moved = { ...emptyAnnotations(baseName(markdownPath)), movedTo: "sidecar" };
      await this.app.save(markdownPath, moved, moved);
      this.pending.delete(markdownPath);
    }
    return saved;
  }
}

async function fileNameFor(markdownPath: string): Promise<string> {
  const bytes = new TextEncoder().encode(markdownPath);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const hex = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex}.json`;
}
