/** Reading dates are calendar days: do not shift an imported day across time zones. */
export function readingDay(value: string | null | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value) || !Number.isFinite(Date.parse(value)))
    return null;
  const day = value.slice(0, 10);
  return new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) === day ? day : null;
}
export function todayDay(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
export function countFinishedInYear(
  library: { status: string; finished_at: string | null }[],
  year: number,
  today = todayDay(),
): number {
  return library.filter((item) => {
    const day = readingDay(item.finished_at);
    return (
      item.status === "read" && day != null && day <= today && Number(day.slice(0, 4)) === year
    );
  }).length;
}
export function validateReadingDates(
  started: string | null,
  finished: string | null,
  today = todayDay(),
) {
  for (const value of [started, finished]) {
    if (value && (!readingDay(value) || value.slice(0, 10) > today))
      throw Error("Le date di lettura devono essere valide e non future.");
  }
  if (started && finished && started.slice(0, 10) > finished.slice(0, 10))
    throw Error("La data di fine precede quella di inizio.");
}
export function canUpdateReading(item: { status: string } | null | undefined): boolean {
  return item?.status === "reading";
}
