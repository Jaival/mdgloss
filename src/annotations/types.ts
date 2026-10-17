/** The sidecar format version this build reads and writes (see docs/SPEC.md#data-model). */
export const SCHEMA_VERSION = 1;

/** Four colours at most (docs/DESIGN.md section 3). Yellow is the default. */
export const HIGHLIGHT_COLORS = ["yellow", "green", "pink", "purple"] as const;
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

export type HighlightStatus = "anchored" | "approximate" | "orphaned";

export interface Highlight {
  id: string;
  /** The source text that was selected, markdown syntax included. */
  quote: string;
  prefix: string;
  suffix: string;
  /** Where the quote started in the source when it was last placed. */
  offset: number;
  color: HighlightColor;
  comment: string | null;
  status: HighlightStatus;
  /** ISO 8601 timestamps. */
  created: string;
  updated: string;
}

/**
 * One markdown file's annotations. Fields this build doesn't manage yet
 * (bookmarks, lastRead) are kept as they were read, so saving never drops them.
 */
export interface AnnotationFile {
  schemaVersion: number;
  /** The markdown file's name, for people reading the sidecar. */
  file: string;
  highlights: Highlight[];
  [field: string]: unknown;
}
