/** Mirrors the shared book-grid breakpoints in styles.css. */
export function bookGridCapacity(
  density: "large" | "standard" | "compact",
  viewportWidth: number,
  rows = 2,
): number {
  const breakpoint = viewportWidth >= 1024 ? 2 : viewportWidth >= 640 ? 1 : 0;
  const columns = { large: [2, 3, 4], standard: [3, 4, 6], compact: [4, 6, 10] }[density][
    breakpoint
  ]!;
  return columns * rows;
}
