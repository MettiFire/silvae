export type ScreenValue = string | number | boolean | null;
const STORAGE_KEY = "silvae:screen-history:v1";
const MAX_ENTRIES = 80;
const validValue = (value: unknown): value is ScreenValue =>
  value === null ||
  typeof value === "boolean" ||
  (typeof value === "string" && value.length <= 2000) ||
  (typeof value === "number" && Number.isFinite(value));
export function screenHistoryKey(userId: string | undefined, pathname: string, entryId: string) {
  return JSON.stringify([userId ?? "guest", pathname, entryId]);
}
/** Small, tab-local UI snapshots. Never store forms, credentials or library records. */
export function createScreenHistory(storage: Pick<Storage, "getItem" | "setItem">) {
  const entries = new Map<string, Map<string, ScreenValue>>();
  const listeners = new Set<() => void>();
  let loaded = false;
  function load() {
    if (loaded) return;
    loaded = true;
    try {
      const raw: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? "[]");
      if (!Array.isArray(raw)) return;
      for (const row of raw.slice(-MAX_ENTRIES)) {
        if (
          !Array.isArray(row) ||
          typeof row[0] !== "string" ||
          row[0].length > 1000 ||
          !Array.isArray(row[1])
        )
          continue;
        const fields = new Map<string, ScreenValue>();
        for (const field of row[1].slice(0, 300))
          if (
            Array.isArray(field) &&
            typeof field[0] === "string" &&
            field[0].length <= 160 &&
            validValue(field[1])
          )
            fields.set(field[0], field[1]);
        entries.set(row[0], fields);
      }
    } catch {
      /* A damaged or blocked cache must not break navigation. */
    }
  }
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    get<T extends ScreenValue>(
      entry: string,
      field: string,
      initial: T,
      validate?: (value: ScreenValue) => boolean,
    ): T {
      load();
      const value = entries.get(entry)?.get(field);
      if (value === undefined || (validate ? !validate(value) : typeof value !== typeof initial))
        return initial;
      return value as T;
    },
    set(entry: string, field: string, value: ScreenValue) {
      load();
      if (!validValue(value)) return;
      const fields = entries.get(entry) ?? new Map<string, ScreenValue>();
      if (fields.get(field) === value) return;
      fields.set(field, value);
      entries.delete(entry);
      entries.set(entry, fields);
      while (entries.size > MAX_ENTRIES) entries.delete(entries.keys().next().value!);
      try {
        storage.setItem(
          STORAGE_KEY,
          JSON.stringify([...entries].map(([key, fields]) => [key, [...fields]])),
        );
      } catch {
        /* In-memory state still survives route changes. */
      }
      listeners.forEach((listener) => listener());
    },
  };
}
