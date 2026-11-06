import { describe, expect, it } from "vitest";
import { findQuote, NEAR } from "./anchor";

/** A highlight on the first `quote` in `source`, saved the way the app saves one. */
function saved(source: string, quote: string, nth = 0) {
  let offset = -1;
  for (let i = 0; i <= nth; i++) offset = source.indexOf(quote, offset + 1);
  if (offset === -1) throw new Error(`"${quote}" is not in the fixture`);
  return {
    quote,
    prefix: source.slice(Math.max(0, offset - 32), offset),
    suffix: source.slice(offset + quote.length, offset + quote.length + 32),
    offset,
  };
}

const notes = `# Processes

In simple terms, a process is a program in execution. Each process has
its own address space.

## Scheduling

The scheduler picks the next process to run. Each process has a priority.

- **Round robin** gives every process a time slice.
- *Priority scheduling* runs the highest priority first.

\`\`\`c
int pid = fork();
\`\`\`
`;

describe("findQuote: unchanged file", () => {
  it("finds the quote at its offset", () => {
    const h = saved(notes, "a program in execution");
    expect(findQuote(notes, h)).toBe(h.offset);
  });

  it("tells repeats apart by their context", () => {
    const second = saved(notes, "Each process has", 1);
    expect(findQuote(notes, second)).toBe(second.offset);
  });
});

describe("findQuote: edited fixtures", () => {
  it("text added above (step 1)", () => {
    const h = saved(notes, "picks the next process");
    const edited = notes.replace("# Processes\n", "# Processes\n\nRead chapter 3 first.\n");
    expect(findQuote(edited, h)).toBe(edited.indexOf("picks the next process"));
  });

  it("text removed above (step 1)", () => {
    const h = saved(notes, "gives every process a time slice");
    const edited = notes.replace(" Each process has\nits own address space.", "");
    expect(findQuote(edited, h)).toBe(edited.indexOf("gives every process a time slice"));
  });

  it("formatting inside the quote kept", () => {
    const h = saved(notes, "**Round robin** gives");
    const edited = notes.replace("## Scheduling", "## CPU scheduling");
    expect(findQuote(edited, h)).toBe(edited.indexOf("**Round robin** gives"));
  });

  it("a code block quote", () => {
    const h = saved(notes, "int pid = fork();");
    const edited = notes.replace("```c", "Forking:\n\n```c");
    expect(findQuote(edited, h)).toBe(edited.indexOf("int pid = fork();"));
  });

  it("moved far away (step 2)", () => {
    const h = saved(notes, "its own address space");
    const edited = `${"Filler paragraph.\n\n".repeat(200)}${notes}`;
    expect(edited.indexOf("its own address space") - h.offset).toBeGreaterThan(NEAR);
    expect(findQuote(edited, h)).toBe(edited.indexOf("its own address space"));
  });

  it("sections swapped", () => {
    const h = saved(notes, "picks the next process");
    const [head, scheduling] = notes.split("## Scheduling");
    const edited = `## Scheduling${scheduling}\n${head}`;
    expect(findQuote(edited, h)).toBe(edited.indexOf("picks the next process"));
  });

  it("context rewritten around a single match", () => {
    const h = saved(notes, "address space");
    const edited = notes.replace("its own address space.", "a private address space, too.");
    expect(findQuote(edited, h)).toBe(edited.indexOf("address space"));
  });

  it("a repeat whose context changed: the closest context wins (step 2)", () => {
    const h = saved(notes, "Each process has", 1);
    // Both repeats lose their exact context, the second keeps its prefix.
    const edited = `Intro.\n\n${notes
      .replace("Each process has\nits", "Each process has\nreally its")
      .replace("Each process has a priority", "Each process has one priority")}`;
    const second = edited.indexOf("Each process has", edited.indexOf("Each process has") + 1);
    expect(findQuote(edited, h)).toBe(second);
  });

  it("a paragraph duplicated: the copy with the saved context wins", () => {
    const h = saved(notes, "a program in execution");
    const paragraph = "In simple terms, a process is a program in execution. Each process has";
    const edited = notes.replace(paragraph, `${paragraph}\n\n${paragraph}`);
    // The saved suffix runs on into "its own address space", which follows the second copy.
    expect(findQuote(edited, h)).toBe(edited.lastIndexOf("a program in execution"));
  });

  it("the quote edited: orphaned", () => {
    const h = saved(notes, "a program in execution");
    expect(findQuote(notes.replace("in execution", "being run"), h)).toBeNull();
  });

  it("the quote deleted: orphaned", () => {
    const h = saved(notes, "its own address space");
    expect(findQuote(notes.replace("its own address space.", ""), h)).toBeNull();
  });

  it("repeats with no context left: orphaned, not guessed", () => {
    const h = saved(notes, "process", 2);
    expect(findQuote("process\n\nprocess\n", h)).toBeNull();
  });

  it("an empty file", () => {
    expect(findQuote("", saved(notes, "fork"))).toBeNull();
  });
});
