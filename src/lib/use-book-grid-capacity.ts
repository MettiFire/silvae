import { useSyncExternalStore } from "react";
import { useBookDensity } from "./book-density";
import { bookGridCapacity } from "./book-grid-size";
const queries = ["(min-width: 640px)", "(min-width: 1024px)"];
function subscribe(onChange: () => void) {
  const media = queries.map((query) => window.matchMedia(query));
  media.forEach((query) => query.addEventListener("change", onChange));
  return () => media.forEach((query) => query.removeEventListener("change", onChange));
}
function snapshot() {
  return window.matchMedia(queries[1]!).matches
    ? 1024
    : window.matchMedia(queries[0]!).matches
      ? 640
      : 0;
}
const serverSnapshot = () => 1024;
/** Resize only when CSS changes column count, not on every resize event. */
export function useBookGridCapacity(rows = 2) {
  const density = useBookDensity();
  const width = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  return bookGridCapacity(density, width, rows);
}
