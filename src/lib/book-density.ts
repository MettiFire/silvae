import { useSyncExternalStore } from "react";
export type BookDensity = "large" | "standard" | "compact";
const KEY = "silvae:book-density";
/** Saved under the previous site name; carried over so readers keep their choice. */
const LEGACY_KEY = "paginae:book-density";
let density: BookDensity = "standard";
let initialized = false;
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
function readStorage(): BookDensity {
  migrate();
  try {
    const value = window.localStorage.getItem(KEY);
    return value === "large" || value === "compact" || value === "standard" ? value : "standard";
  } catch {
    return density;
  }
}
function snapshot(): BookDensity {
  if (!initialized) {
    density = readStorage();
    initialized = true;
  }
  return density;
}
function onStorage(event: StorageEvent) {
  if (event.key !== null && event.key !== KEY) return;
  const next = readStorage();
  if (next === density) return;
  density = next;
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    density = readStorage();
    initialized = true;
    window.addEventListener("storage", onStorage);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) window.removeEventListener("storage", onStorage);
  };
}
export function setBookDensity(value: BookDensity) {
  density = value;
  initialized = true;
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
