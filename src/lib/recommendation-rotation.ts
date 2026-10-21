const KEY = "paginae:recommendation-rotation";
export function advanceRotation(previous: number | null, random = Math.random): number {
  return previous != null && Number.isInteger(previous) && previous >= 0 && previous < 1_000_000
    ? (previous + 1) % 1_000_000
    : Math.floor(random() * 999_999) + 1;
}
export function nextRecommendationRotation(): number {
  let previous: number | null = null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw !== null) previous = Number(raw);
  } catch {
    /* Rotation also works when browser storage is disabled. */
  }
  const next = advanceRotation(previous);
  try {
    sessionStorage.setItem(KEY, String(next));
  } catch {
    /* Optional persistence. */
  }
  return next;
}
