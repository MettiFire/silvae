import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { Book } from "./books";
import type { LibraryItem } from "./library";

const WEEK = 7 * 86400000;
type Entry = { key: QueryKey; data: unknown; updatedAt: number };
type Snapshot = { version: 1; owner: string; savedAt: number; entries: Entry[] };
export type LibraryCacheStore = {
  read: () => Promise<unknown>;
  write: (value: Snapshot) => Promise<void>;
  clear: () => Promise<void>;
};
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === "string");
function validBook(value: unknown): value is Book {
  return (
    object(value) &&
    typeof value["id"] === "string" &&
    typeof value["title"] === "string" &&
    strings(value["authors"]) &&
    strings(value["categories"]) &&
    (value["cover_url"] == null || typeof value["cover_url"] === "string") &&
    (value["description"] == null || typeof value["description"] === "string")
  );
}
function validLibrary(value: unknown, owner: string): value is LibraryItem[] {
  return (
    Array.isArray(value) &&
    value.length <= 10000 &&
    value.every(
      (row) =>
        object(row) &&
        row["user_id"] === owner &&
        typeof row["id"] === "string" &&
        typeof row["book_id"] === "string" &&
        ["read", "reading", "to_read", "abandoned"].includes(String(row["status"])) &&
        typeof row["created_at"] === "string" &&
        typeof row["updated_at"] === "string" &&
        (row["books"] === null || (validBook(row["books"]) && row["books"].id === row["book_id"])),
    )
  );
}
function allowed(entry: Entry, owner: string, ids: Set<string>) {
  const key = entry["key"];
  if (key[0] === "library")
    return key.length === 2 && key[1] === owner && validLibrary(entry["data"], owner);
  if (key[0] === "book")
    return (
      key.length === 3 &&
      typeof key[1] === "string" &&
      typeof key[2] === "string" &&
      ids.has(key[1]) &&
      validBook(entry["data"]) &&
      entry["data"].id === key[1]
    );
  if (key[0] === "manga-volume-covers-v2") {
    const owned = ids.has(`manga:md:${key[1]}`) || ids.has(`manga:mal:${key[2]}`);
    return (
      key.length === 5 &&
      owned &&
      Array.isArray(entry["data"]) &&
      entry["data"].length <= 2000 &&
      entry["data"].every(
        (c) =>
          object(c) &&
          Number.isInteger(c["volume"]) &&
          Number(c["volume"]) > 0 &&
          typeof c["url"] === "string" &&
          (c["cover_candidates"] === undefined || strings(c["cover_candidates"])),
      )
    );
  }
  return false;
}

/** Persist only owned reading data and its catalogue metadata, never auth or fragments. */
export function librarySnapshot(
  client: QueryClient,
  owner: string,
  now = Date.now(),
): Snapshot | null | undefined {
  const library = client.getQueryState<LibraryItem[]>(["library", owner]);
  if (!library?.data) return undefined;
  if (
    library.isInvalidated ||
    now - library.dataUpdatedAt > WEEK ||
    !validLibrary(library.data, owner)
  )
    return null;
  const ids = new Set(library.data.map((row) => row["book_id"]));
  const entries = client
    .getQueryCache()
    .getAll()
    .filter(
      (q) =>
        !q.state.isInvalidated && q.state.data !== undefined && now - q.state.dataUpdatedAt <= WEEK,
    )
    .map((q) => ({ key: q.queryKey, data: q.state.data, updatedAt: q.state.dataUpdatedAt }))
    .filter((entry) => allowed(entry, owner, ids))
    .sort((a, b) =>
      a.key[0] === "library" ? -1 : b.key[0] === "library" ? 1 : b.updatedAt - a.updatedAt,
    )
    .slice(0, 200);
  const selected: Entry[] = [];
  let size = 0;
  try {
    for (const entry of entries) {
      const length = JSON.stringify(entry).length;
      if (size + length > 8000000) {
        if (entry["key"][0] === "library") return null;
        continue;
      }
      selected.push(entry);
      size += length;
    }
  } catch {
    return null;
  }
  return { version: 1, owner, savedAt: now, entries: selected };
}

export function restoreLibrarySnapshot(
  client: QueryClient,
  owner: string,
  value: unknown,
  now = Date.now(),
) {
  if (
    !object(value) ||
    value["version"] !== 1 ||
    value["owner"] !== owner ||
    typeof value["savedAt"] !== "number" ||
    !Number.isFinite(value["savedAt"]) ||
    value["savedAt"] > now + 60000 ||
    now - value["savedAt"] > WEEK ||
    !Array.isArray(value["entries"]) ||
    value["entries"].length > 200
  )
    return false;
  const entries: Entry[] = [];
  for (const entry of value["entries"]) {
    if (
      !object(entry) ||
      !Array.isArray(entry["key"]) ||
      typeof entry["updatedAt"] !== "number" ||
      !Number.isFinite(entry["updatedAt"]) ||
      entry["updatedAt"] <= 0 ||
      entry["updatedAt"] > now + 60000
    )
      return false;
    if (now - entry["updatedAt"] > WEEK) {
      if (entry["key"][0] === "library") return false;
      continue;
    }
    entries.push({ key: entry["key"], data: entry["data"], updatedAt: entry["updatedAt"] });
  }
  const library = entries.find((entry) => entry["key"][0] === "library");
  if (!library || !validLibrary(library.data, owner)) return false;
  const ids = new Set(library.data.map((row) => row["book_id"]));
  if (!entries.every((entry) => allowed(entry, owner, ids))) return false;
  for (const entry of entries) {
    if ((client.getQueryState(entry["key"])?.dataUpdatedAt ?? 0) < entry["updatedAt"])
      client.setQueryData(entry["key"], entry["data"], { updatedAt: entry["updatedAt"] });
  }
  return true;
}

export function createLibraryCache(client: QueryClient, store: LibraryCacheStore) {
  let owner: string | null | undefined;
  let generation = 0;
  let unsubscribe: (() => void) | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let ready = Promise.resolve();
  let io: Promise<unknown> = Promise.resolve();
  // Serialize storage operations so a late write can never overtake logout deletion.
  const enqueue = <T>(action: () => Promise<T>): Promise<T | undefined> => {
    const task = io.then(action).catch(() => undefined);
    io = task;
    return task;
  };
  const flush = async () => {
    if (timer) clearTimeout(timer);
    if (!owner) return;
    const value = librarySnapshot(client, owner);
    if (value === null) await enqueue(store.clear);
    else if (value) await enqueue(() => store.write(value));
  };
  return {
    flush,
    activate(nextOwner: string | null) {
      if (owner === nextOwner) return ready;
      const previous = owner;
      owner = nextOwner;
      const ticket = ++generation;
      unsubscribe?.();
      if (timer) clearTimeout(timer);
      ready = (async () => {
        if (previous || !nextOwner) await enqueue(store.clear);
        if (!nextOwner) return;
        const saved = await enqueue(store.read);
        if (ticket !== generation) return;
        if (!restoreLibrarySnapshot(client, nextOwner, saved)) await enqueue(store.clear);
        if (ticket !== generation) return;
        unsubscribe = client.getQueryCache().subscribe((event) => {
          if (
            event.type !== "updated" ||
            !["success", "invalidate", "setState"].includes(event.action.type)
          )
            return;
          const key = event.query.queryKey;
          if (!["library", "book", "manga-volume-covers-v2"].includes(String(key[0]))) return;
          if (key[0] === "library" && key[1] !== nextOwner) return;
          if (timer) clearTimeout(timer);
          // Invalidation follows writes/removals: immediately discard the old snapshot.
          if (event.query.queryKey[0] === "library" && event.action.type === "invalidate")
            void flush();
          else timer = setTimeout(() => void flush(), 250);
        });
        await flush();
      })();
      return ready;
    },
    dispose() {
      generation++;
      unsubscribe?.();
      if (timer) clearTimeout(timer);
    },
  };
}
