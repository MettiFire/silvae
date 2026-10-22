import { useSyncExternalStore } from "react";
export type BookDensity = "large" | "standard" | "compact";
const KEY = "silvae:book-density";
/** Saved under the previous site name; carried over so readers keep their choice. */
const LEGACY_KEY = "paginae:book-density";
let fallback: BookDensity = "standard";
const listeners = new Set<() => void>();
let migrated = false;
function migrate() {
  if (migrated) return;
  migrated = true;
  try {
    if (window.localStorage.getItem(KEY) === null) {
      const legacy = window.localStorage.getItem(LEGACY_KEY);
      if (legacy !== null) window.localStorage.setItem(KEY, legacy);
    }
  } catch {
    /* Storage unavailable: the control still works for this tab. */
  }
}
function snapshot(): BookDensity {
  migrate();
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
