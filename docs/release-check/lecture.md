# Release check: processes

Copy this folder somewhere outside the repo before opening it in mdgloss. The release checklist in `docs/RELEASING.md` says what to select and what to expect.

## Formatting

A _process_ is a program in **execution**, together with its state.

A fork bomb grows as 2 \* 2 \* 2 processes and more.

Entities: &copy; 2026 and caf&eacute;.

## List

- The kernel keeps a process control block for each process.
- It stores the registers, the program counter and the open files.
- A context switch saves one block and loads another.

## Table

| State   | Meaning                     |
| ------- | --------------------------- |
| Ready   | Waiting for a CPU           |
| Running | Instructions are being run  |
| Blocked | Waiting for I/O or an event |

## Code

```c
pid_t pid = fork();
if (pid == 0) {
    execvp(argv[0], argv);
}
```

## Footnote and links

Threads share the address space of their process.[^1]

- [Back to the top](#release-check-processes)
- [The Tauri website](https://tauri.app)
- [Week 2 notes](week2/notes.md)
- [The logo file](logo.svg)

[^1]: Each thread still has its own stack and registers.

## Images

![The mdgloss logo](logo.svg)

![[logo.svg|64]]

![A missing image](missing.png)
