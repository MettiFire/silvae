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
/** A shared daily shuffle, stable across refreshes and devices, with a full pool before repeats. */
export function dailyFragment(day: string) {
  const date = Date.parse(`${day}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    !Number.isFinite(date) ||
    new Date(date).toISOString().slice(0, 10) !== day
  )
    throw Error("Giorno non valido");
  const ordinal = Math.floor(date / 86400000),
    n = DAILY_FRAGMENTS.length;
  const cycle = Math.floor(ordinal / n);
  const shuffle = (seed: number) => {
    let state = (seed ^ 0x5f3759df) >>> 0;
    const order = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      const j = state % (i + 1);
      [order[i], order[j]] = [order[j]!, order[i]!];
    }
    return order;
  };
  const order = shuffle(cycle);
  if (order[0] === shuffle(cycle - 1)[n - 1]) [order[0], order[1]] = [order[1]!, order[0]!];
  return DAILY_FRAGMENTS[order[((ordinal % n) + n) % n]!]!;
}
