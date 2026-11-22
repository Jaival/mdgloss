import { useEffect, useState } from "react";

/** Annotate shows the sidebar, header and margin notes; focus hides them (docs/UI-PLAN.md). */
export type ReaderMode = "annotate" | "focus";

const STORAGE_KEY = "mdgloss.mode";

/** A stored mode, or "annotate" when nothing (or something unknown) is stored. */
export function parseMode(stored: string | null): ReaderMode {
  return stored === "focus" ? "focus" : "annotate";
}

/** The reader mode, remembered between sessions next to the theme and fonts. */
export function useReaderMode() {
  const [mode, setMode] = useState(() => parseMode(localStorage.getItem(STORAGE_KEY)));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  return { mode, setMode };
}
