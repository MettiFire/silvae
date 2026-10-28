import type { KindleBookReading } from "./kindle-cloud.ts";
export function kindlePercentage(
  reading: KindleBookReading,
  metadata: { start?: number; end?: number; percentage?: number },
) {
  if (reading.status !== "available" || reading.position === undefined) return reading;
  const { start, end } = metadata;
  if (
    Number.isSafeInteger(start) &&
    Number.isSafeInteger(end) &&
    start! >= 0 &&
    end! > start! &&
    reading.position >= start! &&
    reading.position <= end!
  ) {
    const percentage =
      reading.position === end
        ? 100
        : Math.min(
            99.99,
            Math.round((10000 * (reading.position - start!)) / (end! - start!)) / 100,
          );
    return { ...reading, percentage, percentageSource: "positions" as const };
  }
  if (
    reading.type === "EBOK" &&
    typeof metadata.percentage === "number" &&
    Number.isFinite(metadata.percentage) &&
    metadata.percentage > 0 &&
    metadata.percentage <= 100
  )
    return { ...reading, percentage: metadata.percentage, percentageSource: "amazon" as const };
  return reading;
}
export function kindleTitleKey(title: string) {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
export function sameKindleAuthor(left: string[], right: string[]) {
  return left.some((a) => right.some((b) => kindleTitleKey(a) === kindleTitleKey(b)));
}
