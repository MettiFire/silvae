import { DAILY_FRAGMENTS } from "../data/daily-fragments.ts";
export function fragmentDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (name: string) => parts.find((p) => p.type === name)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
const EPOCH = Date.parse("2026-10-24T00:00:00Z") / 86400000;
type FragmentWork = { id: string; title: string; author: string };
const normalized = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
/** Fixed work rotation: N different books means a minimum gap of N calendar days.
 * Multiple excerpts from one work never give it extra slots. Keep catalogue order stable.
 */
export function selectDailyFragment<T extends FragmentWork>(day: string, pool: readonly T[]): T {
  const date = Date.parse(`${day}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    !Number.isFinite(date) ||
    new Date(date).toISOString().slice(0, 10) !== day
  )
    throw Error("Giorno non valido");
  const works = new Map<string, T[]>();
  for (const entry of pool) {
    const key = `${normalized(entry.author)}:${normalized(entry.title)}`;
    const excerpts = works.get(key) ?? [];
    excerpts.push(entry);
    works.set(key, excerpts);
  }
  const groups = [...works.values()];
  if (!groups.length) throw Error("Nessun frammento disponibile");
  const offset = Math.floor(date / 86400000) - EPOCH;
  const index = ((offset % groups.length) + groups.length) % groups.length;
  const excerpts = groups[index]!;
  const cycle = Math.floor(offset / groups.length);
  return excerpts[((cycle % excerpts.length) + excerpts.length) % excerpts.length]!;
}
export function dailyFragment(day: string) {
  return selectDailyFragment(day, DAILY_FRAGMENTS);
}
