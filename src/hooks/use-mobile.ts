import { useSyncExternalStore } from "react";

// docs/DESIGN.md: below ~640px (the web demo on phones) the sidebar becomes a Sheet.
const MOBILE_BREAKPOINT = 640;
const query = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

function subscribe(onChange: () => void) {
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function useIsMobile() {
  return useSyncExternalStore(subscribe, () => query.matches);
}
