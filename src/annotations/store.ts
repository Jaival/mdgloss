import { baseName, joinPath } from "../fs/path";
import type { FileSystem } from "../fs/types";
import { emptyAnnotations, parseAnnotations, serializeAnnotations } from "./format";
import { sidecarPath } from "./sidecar";
import type { AnnotationFile } from "./types";

/** Where a markdown file's annotations are read from and written to. */
export interface AnnotationStore {
  /** "sidecar": a .mdgloss folder next to the file. "app": the app's own storage. */
  readonly kind: "sidecar" | "app";
  /** Throws if the stored file exists but can't be read safely; see parseAnnotations. */
  load(markdownPath: string): Promise<AnnotationFile>;
  save(markdownPath: string, annotations: AnnotationFile): Promise<void>;
}

/**
 * Keeps annotations in `.mdgloss/<name>.json` next to each markdown file, so
 * they travel with the folder. `allow` runs before each access, to grant the
 * hidden folder (see allow_sidecar in src-tauri).
 */
export class SidecarStore implements AnnotationStore {
  readonly kind = "sidecar";

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

  async save(markdownPath: string, annotations: AnnotationFile): Promise<void> {
    await this.allow(markdownPath);
    const path = this.pathFor(markdownPath);
    await this.fs.createDir(path.slice(0, Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"))));
    await this.fs.writeFile(path, serializeAnnotations(annotations));
  }

  /** sidecarPath uses "/", which Windows accepts too; keep the folder's own style. */
  private pathFor(markdownPath: string): string {
    const path = sidecarPath(markdownPath);
    return markdownPath.includes("\\") ? path.replace(/\//g, "\\") : path;
  }
}

/**
 * Keeps annotations in the app's data folder, for single files and read-only
 * folders. Each file is named after a hash of the markdown file's absolute
 * path, and records that path so it can be read by a person.
 */
export class AppDataStore implements AnnotationStore {
  readonly kind = "app";

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

  async save(markdownPath: string, annotations: AnnotationFile): Promise<void> {
    const dir = await this.dir();
    await this.fs.createDir(dir);
    const path = joinPath(dir, await fileNameFor(markdownPath));
    await this.fs.writeFile(path, serializeAnnotations({ ...annotations, path: markdownPath }));
  }

  private async pathFor(markdownPath: string): Promise<string> {
    return joinPath(await this.dir(), await fileNameFor(markdownPath));
  }
}

async function fileNameFor(markdownPath: string): Promise<string> {
  const bytes = new TextEncoder().encode(markdownPath);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const hex = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex}.json`;
}
