import { eligibleReading, type ChallengeEnrollment } from "./reading-challenges.ts";
import type { LibraryItem } from "./library";
export function countryFlag(code: string) {
  return /^[A-Z]{2}$/.test(code)
    ? String.fromCodePoint(...[...code].map((letter) => 127397 + letter.charCodeAt(0)))
    : "";
}
export function countryReadingGroups(
  items: LibraryItem[],
  enrollment: ChallengeEnrollment,
  completedId?: string,
) {
  const valid = items.filter((item) => eligibleReading(item, enrollment));
  if (completedId)
    valid.sort((a, b) => Number(b.book_id === completedId) - Number(a.book_id === completedId));
  return {
    valid,
    pending: items.filter((item) => item.status === "to_read" || item.status === "reading"),
    outside: items.filter(
      (item) =>
        item.status !== "to_read" &&
        item.status !== "reading" &&
        !eligibleReading(item, enrollment),
    ),
  };
}
