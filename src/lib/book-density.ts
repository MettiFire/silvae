import { useSyncExternalStore } from "react";
export type BookDensity = "large" | "standard" | "compact";
const KEY = "paginae:book-density";
let fallback: BookDensity = "standard";
const listeners = new Set<() => void>();
function snapshot(): BookDensity {
  try {
    const value = window.localStorage.getItem(KEY);
    return value === "large" || value === "compact" || value === "standard" ? value : fallback;
  } catch {
    return fallback;
  }
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}
export function setBookDensity(value: BookDensity) {
  fallback = value;
  try {
    window.localStorage.setItem(KEY, value);
  } catch {
    /* The current tab still supports the control when storage is unavailable. */
  }
  listeners.forEach((listener) => listener());
}
export function useBookDensity() {
  return useSyncExternalStore(subscribe, snapshot, () => "standard" as BookDensity);
}
