import type { LibraryItem } from "./library";
import { readingDay, todayDay } from "./reading-dates.ts";
import { authorCountryKey } from "./author-country-key.ts";
const MONTHS = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
const DAYS = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
export function readingStatistics(items: LibraryItem[], selectedYear: number, today = todayDay()) {
  const read = items.filter((i) => i.status === "read");
  const pagesOf = (i: LibraryItem) =>
    Math.max(0, (i.total_pages && i.total_pages > 0 ? i.total_pages : i.books?.page_count) ?? 0);
  const dated = read.flatMap((item) => {
    const day = readingDay(item.finished_at);
    return day && day <= today ? [{ item, day }] : [];
  });
  const years = [
    ...new Set([Number(today.slice(0, 4)), ...dated.map(({ day }) => Number(day.slice(0, 4)))]),
  ].sort((a, b) => b - a);
  const byYear = years.map((year) => {
    const books = dated.filter(({ day }) => Number(day.slice(0, 4)) === year);
    return {
      year,
      libri: books.length,
      pages: books.reduce((sum, { item }) => sum + pagesOf(item), 0),
    };
  });
  const selected = dated.filter(({ day }) => Number(day.slice(0, 4)) === selectedYear);
  const byMonth = MONTHS.map((month, idx) => ({
    month,
    libri: selected.filter(({ day }) => Number(day.slice(5, 7)) === idx + 1).length,
  }));
  const genreCounts = new Map<string, number>();
  read.forEach((i) =>
    [...new Set(i.books?.categories ?? [])].forEach((c) =>
      genreCounts.set(c, (genreCounts.get(c) ?? 0) + 1),
    ),
  );
  const byGenre = [...genreCounts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));
  const byDay = DAYS.map((day, idx) => ({
    day,
    libri: dated.filter((d) => new Date(`${d.day}T00:00:00Z`).getUTCDay() === idx).length,
  }));
  const rated = read.filter((i) => i.rating != null && i.rating >= 0 && i.rating <= 5);
  const knownPages = read.filter((i) => pagesOf(i) > 0);
  const durations = dated.flatMap(({ item, day }) => {
    const start = readingDay(item.started_at);
    if (!start || start > day) return [];
    return [
      {
        days: Math.max(1, (Date.parse(day) - Date.parse(start)) / 86400000 + 1),
        pages: pagesOf(item),
      },
    ];
  });
  const paceSamples = durations.filter((d) => d.pages > 0);
  const inLastDays = (days: number) =>
    dated.filter(({ day }) => {
      const difference = (Date.parse(today) - Date.parse(day)) / 86400000;
      return difference >= 0 && difference < days;
    }).length;
  const totalPages = knownPages.reduce((sum, i) => sum + pagesOf(i), 0);
  const started = items.filter((i) => i.status !== "to_read").length;
  return {
    read,
    totalPages,
    years,
    byYear,
    byMonth,
    byGenre,
    byDay,
    started,
    undated: read.length - dated.length,
    last7: inLastDays(7),
    last30: inLastDays(30),
    last90: inLastDays(90),
    completion: started ? Math.round((read.length / started) * 100) : 0,
    pace: paceSamples.length
      ? Math.round(
          paceSamples.reduce((s, d) => s + d.pages, 0) /
            paceSamples.reduce((s, d) => s + d.days, 0),
        )
      : null,
    avgDays: durations.length
      ? Math.round(durations.reduce((s, d) => s + d.days, 0) / durations.length)
      : null,
    avgPages: knownPages.length ? Math.round(totalPages / knownPages.length) : null,
    avgRating: rated.length
      ? (rated.reduce((s, i) => s + i.rating!, 0) / rated.length).toFixed(1)
      : null,
    rated: rated.length,
    authors: new Set(read.flatMap((i) => i.books?.authors ?? []).map(authorCountryKey)).size,
    reading: items.filter((i) => i.status === "reading").length,
    waiting: items.filter((i) => i.status === "to_read").length,
    abandoned: items.filter((i) => i.status === "abandoned").length,
    hours: Math.round(totalPages / 40),
  };
}
