import type { LibraryCacheStore } from "./library-cache";

/** One account snapshot per browser. IndexedDB is optional and never blocks auth. */
function transaction(mode: IDBTransactionMode, value?: unknown, remove = false): Promise<unknown> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    let db: IDBDatabase | undefined;
    let settled = false;
    const finish = (result: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      db?.close();
      resolve(result);
    };
    const timeout = setTimeout(() => finish(null), 1000);
    try {
      const open = indexedDB.open("silvae-library-cache", 1);
      open.onupgradeneeded = () => open.result.createObjectStore("snapshots");
      open.onerror = () => finish(null);
      open.onblocked = () => finish(null);
      open.onsuccess = () => {
        try {
          db = open.result;
          if (settled) {
            db.close();
            return;
          }
          const tx = db.transaction("snapshots", mode);
          const store = tx.objectStore("snapshots");
          const request =
            mode === "readonly"
              ? store.get("current")
              : remove
                ? store.delete("current")
                : store.put(value, "current");
          let result: unknown;
          request.onsuccess = () => {
            result = request.result;
          };
          tx.oncomplete = () => finish(result);
          tx.onabort = () => finish(null);
          tx.onerror = () => finish(null);
        } catch {
          finish(null);
        }
      };
    } catch {
      finish(null);
    }
  });
}
export const libraryCacheStorage: LibraryCacheStore = {
  read: () => transaction("readonly"),
  write: async (value) => {
    await transaction("readwrite", value);
  },
  clear: async () => {
    await transaction("readwrite", undefined, true);
  },
};
