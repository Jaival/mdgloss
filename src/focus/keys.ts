/** The parts of a keydown that decide a focus-mode shortcut. */
export interface FocusKey {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  repeat: boolean;
  /** Something else already handled the key. */
  defaultPrevented: boolean;
  /** The key was typed into a text field. */
  textEntry: boolean;
}

export interface FocusKeyState {
  focus: boolean;
  /** A palette, popover, sheet, dialog or the highlight toolbar is open. */
  overlayOpen: boolean;
  hasDocument: boolean;
}

export type FocusKeyAction = "toggle" | "leave" | "notes" | null;

/**
 * What a key does for focus mode (docs/DESIGN.md section 8): Ctrl/Cmd+. switches
 * the mode, Esc leaves it and N opens the notes. Each acts only when nothing
 * else is open and the key isn't typed into a field, so Esc first closes
 * whatever is open.
 */
export function focusKeyAction(event: FocusKey, state: FocusKeyState): FocusKeyAction {
  if (event.repeat || event.defaultPrevented || event.textEntry || state.overlayOpen) return null;
  const command = event.ctrlKey || event.metaKey;
  if (command && !event.altKey && !event.shiftKey && event.key === ".") return "toggle";
  if (command || event.altKey || !state.focus) return null;
  if (event.key === "Escape" && !event.shiftKey) return "leave";
  if (state.hasDocument && (event.key === "n" || event.key === "N")) return "notes";
  return null;
}
