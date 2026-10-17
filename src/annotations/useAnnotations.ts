import { useEffect, useRef, useState } from "react";
import type { AnnotationStore, StorageLocation } from "./store";
import type { AnnotationFile, Highlight } from "./types";

interface Loaded {
  path: string;
  /** null when the stored file couldn't be read; it is then never written. */
  file: AnnotationFile | null;
  error: string | null;
  /** Where the last save went; null before the first save. */
  location: StorageLocation | null;
}

export interface Annotations {
  /** Empty while loading, and when the stored file couldn't be read. */
  highlights: Highlight[];
  /** False until loaded, and when saving would overwrite a file that couldn't be read. */
  editable: boolean;
  error: string | null;
  /** Where the last save went; null before the first save. */
  location: StorageLocation | null;
  /** Applies a change to the highlights and saves the file. */
  update: (change: (highlights: Highlight[]) => Highlight[]) => void;
}

/**
 * The annotations of the markdown file at `path`. Saves are queued, so they
 * reach the disk in the order they were made.
 */
export function useAnnotations(store: AnnotationStore | null, path: string | null): Annotations {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  // The latest state, for updates made before React re-renders.
  const latest = useRef<Loaded | null>(null);
  const saving = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!store || !path) return;
    let cancelled = false;
    const show = (next: Loaded) => {
      if (cancelled) return;
      latest.current = next;
      setLoaded(next);
    };
    store.load(path).then(
      (file) => show({ path, file, error: null, location: null }),
      (e: unknown) =>
        show({ path, file: null, error: `Annotations not loaded: ${message(e)}`, location: null }),
    );
    return () => {
      cancelled = true;
    };
  }, [store, path]);

  // A result for another file (or none yet) means this file is still loading.
  const current = loaded && loaded.path === path ? loaded : null;

  function update(change: (highlights: Highlight[]) => Highlight[]) {
    const state = latest.current;
    if (!store || !state || state.path !== path || !state.file) return;
    const file = { ...state.file, highlights: change(state.file.highlights) };
    const next = { ...state, file, error: null };
    latest.current = next;
    setLoaded(next);
    saving.current = saving.current
      .then(() => store.save(state.path, file))
      .then((location) => {
        if (latest.current?.path !== state.path) return;
        latest.current = { ...latest.current, location };
        setLoaded(latest.current);
      })
      .catch((e: unknown) => {
        // The change stays on screen; the error says it isn't on disk.
        if (latest.current?.path !== state.path) return;
        latest.current = { ...latest.current, error: `Annotations not saved: ${message(e)}` };
        setLoaded(latest.current);
      });
  }

  return {
    highlights: current?.file?.highlights ?? [],
    editable: Boolean(current?.file),
    error: current?.error ?? null,
    location: current?.location ?? null,
    update,
  };
}

function message(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
