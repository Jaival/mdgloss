import {
  HIGHLIGHT_COLORS,
  SCHEMA_VERSION,
  type AnnotationFile,
  type Highlight,
  type HighlightColor,
  type HighlightStatus,
} from "./types";

const STATUSES: HighlightStatus[] = ["anchored", "approximate", "orphaned"];

/**
 * Highlights this build can't read, kept on the parsed file so saving writes
 * them back unchanged. A symbol key survives object spread but not JSON.
 */
const UNREADABLE = Symbol("unreadable highlights");
type Parsed = AnnotationFile & { [UNREADABLE]?: unknown[] };

/** A file with no annotations yet. */
export function emptyAnnotations(file: string): AnnotationFile {
  return { schemaVersion: SCHEMA_VERSION, file, highlights: [] };
}

/**
 * Reads an annotation file. Throws on anything it can't read safely: broken
 * JSON, or a newer schemaVersion written by a later build. The caller must then
 * leave the file alone, because saving over it would lose annotations.
 * A highlight with a missing or broken field is left out of `highlights` but
 * written back as it was by serializeAnnotations.
 */
export function parseAnnotations(json: string): AnnotationFile {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch (e) {
    throw new Error(`Annotation file is not valid JSON: ${(e as Error).message}`, { cause: e });
  }
  if (!isRecord(data)) throw new Error("Annotation file is not a JSON object");

  const version = data.schemaVersion;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    throw new Error("Annotation file has no valid schemaVersion");
  }
  if (version > SCHEMA_VERSION) {
    throw new Error(
      `Annotation file uses schemaVersion ${version}; this version of mdgloss reads ${SCHEMA_VERSION}. Update mdgloss to open it.`,
    );
  }

  const entries: unknown[] = Array.isArray(data.highlights) ? data.highlights : [];
  const parsed: Parsed = {
    ...data,
    schemaVersion: version,
    file: typeof data.file === "string" ? data.file : "",
    highlights: entries.filter(isHighlight).map(normalizeHighlight),
  };
  const unreadable = entries.filter((entry) => !isHighlight(entry));
  if (unreadable.length > 0) parsed[UNREADABLE] = unreadable;
  return parsed;
}

/** Writes an annotation file as readable, diff-friendly JSON. */
export function serializeAnnotations(annotations: AnnotationFile): string {
  const unreadable = (annotations as Parsed)[UNREADABLE] ?? [];
  const data = { ...annotations, highlights: [...annotations.highlights, ...unreadable] };
  return `${JSON.stringify(data, null, 2)}\n`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHighlight(value: unknown): value is Record<string, unknown> & Highlight {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.quote === "string" &&
    value.quote !== "" &&
    typeof value.offset === "number" &&
    Number.isInteger(value.offset) &&
    value.offset >= 0
  );
}

/** Fills in optional fields so the rest of the app can rely on them. Unknown fields are kept. */
function normalizeHighlight(value: Record<string, unknown> & Highlight): Highlight {
  return {
    ...value,
    prefix: typeof value.prefix === "string" ? value.prefix : "",
    suffix: typeof value.suffix === "string" ? value.suffix : "",
    color: HIGHLIGHT_COLORS.includes(value.color) ? value.color : ("yellow" as HighlightColor),
    comment: typeof value.comment === "string" ? value.comment : null,
    status: STATUSES.includes(value.status) ? value.status : "anchored",
    created: typeof value.created === "string" ? value.created : "",
    updated: typeof value.updated === "string" ? value.updated : "",
  };
}
