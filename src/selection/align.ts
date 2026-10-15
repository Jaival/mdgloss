/** A half-open range of source offsets. */
export interface SourceSpan {
  start: number;
  end: number;
}

const ENTITY = /&(?:#\d+|#x[\da-f]+|[a-z][a-z\d]*);/iy;
/** ASCII punctuation, the characters a backslash can escape in CommonMark. */
const ESCAPABLE = /^[!-/:-@[-`{-~]$/;

/**
 * Finds the source range of every character of `rendered`, which is the text
 * the renderer produced from source[from, to). Rendering only removes markup
 * from text (escapes, entities, the "> " of continued blockquote lines), so
 * each rendered character is matched to the next equal source character.
 *
 * An entity or escape maps as a whole, so "©" covers "&copy;" and "*"
 * covers "\*". Code is `literal`: entities and escapes there are plain text.
 * A character with no match gets an empty range at the current position.
 */
export function alignText(
  rendered: string,
  source: string,
  from: number,
  to: number,
  literal = false,
): SourceSpan[] {
  const spans: SourceSpan[] = [];
  let cursor = from;

  for (const char of splitCodeUnits(rendered)) {
    const entity = !literal && source[cursor] === "&" ? entityAt(source, cursor, to) : undefined;
    if (entity && (char !== "&" || entity === "&amp;" || entity === "&#38;")) {
      spans.push({ start: cursor, end: cursor + entity.length });
      cursor += entity.length;
      continue;
    }

    const at = source.indexOf(char, cursor);
    if (at === -1 || at >= to) {
      spans.push({ start: cursor, end: cursor });
      continue;
    }
    // "\*" renders as "*": the backslash belongs to the character.
    const escaped = !literal && at > cursor && source[at - 1] === "\\" && ESCAPABLE.test(char);
    spans.push({ start: escaped ? at - 1 : at, end: at + 1 });
    cursor = at + 1;
  }
  return spans;
}

function entityAt(source: string, at: number, to: number): string | undefined {
  ENTITY.lastIndex = at;
  const entity = ENTITY.exec(source)?.[0];
  return entity && at + entity.length <= to ? entity : undefined;
}

/**
 * DOM offsets count UTF-16 code units, so the text is split the same way: an
 * emoji is two "characters", each matched to its half in the source.
 */
function splitCodeUnits(text: string): string[] {
  return Array.from({ length: text.length }, (_, i) => text[i]);
}
