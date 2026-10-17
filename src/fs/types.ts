/**
 * All file access in mdgloss goes through this interface.
 * Adapters: TauriFileSystem (desktop), BrowserFileSystem (File System Access API),
 * DemoFileSystem (in-memory sample docs for the web demo).
 */
export interface Entry {
  path: string;
  name: string;
  kind: "file" | "directory";
}

export interface ChangeEvent {
  path: string;
  kind: "created" | "modified" | "removed";
}

export type Unsubscribe = () => void;

export interface FileSystem {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  listDir(path: string): Promise<Entry[]>;
  exists(path: string): Promise<boolean>;
  /** Creates a folder and any missing parents. Does nothing if it exists. */
  createDir(path: string): Promise<void>;
  watch(path: string, onChange: (event: ChangeEvent) => void): Unsubscribe;
  canWrite(path: string): Promise<boolean>;
}
